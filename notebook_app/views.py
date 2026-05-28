import json

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt

from .models import CellOutput, Notebook, NotebookCell


def notebook_list(request):
    """
    Renders dashboard to list and create notebooks.
    """
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        if not name:
            name = "Untitled Notebook"
        # Create notebook
        notebook = Notebook.objects.create(name=name)
        # Create a default first code cell
        NotebookCell.objects.create(
            notebook=notebook, code="print('Hello, Lit & Pyodide!')", order=0
        )
        return redirect("notebook_detail", pk=notebook.pk)

    notebooks = Notebook.objects.all().order_by("-updated_at")
    return render(request, "notebook_app/notebook_list.html", {"notebooks": notebooks})


def notebook_detail(request, pk):
    """
    Renders the interactive workspace page for a single notebook.
    """
    notebook = get_object_or_404(Notebook, pk=pk)
    return render(request, "notebook_app/notebook_detail.html", {"notebook": notebook})


def api_get_notebook(request, pk):
    """
    API endpoint to retrieve full notebook JSON state including cells and outputs.
    """
    notebook = get_object_or_404(Notebook, pk=pk)
    cells_data = []

    # Prefetch or query cells with their outputs
    for cell in notebook.cells.all().order_by("order"):
        outputs_data = []
        for output in cell.outputs.all():
            outputs_data.append({"type": output.type, "content": output.content})

        cells_data.append(
            {"id": cell.pk, "code": cell.code, "order": cell.order, "outputs": outputs_data}
        )

    return JsonResponse({"id": notebook.pk, "name": notebook.name, "cells": cells_data})


@csrf_exempt  # We can use CSRF exempt or session auth for development convenience.
def api_save_notebook(request, pk):
    """
    API endpoint to save the full state of a notebook in a database transaction.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    notebook = get_object_or_404(Notebook, pk=pk)

    try:
        data = json.loads(request.body)
        name = data.get("name", "").strip()
        cells = data.get("cells", [])

        with transaction.atomic():
            if name:
                notebook.name = name
                notebook.save()

            # Clear existing cells (this will also cascade-delete outputs)
            notebook.cells.all().delete()

            # Re-create cells and their outputs
            for cell_data in cells:
                code = cell_data.get("code", "")
                order = cell_data.get("order", 0)
                outputs = cell_data.get("outputs", [])

                db_cell = NotebookCell.objects.create(notebook=notebook, code=code, order=order)

                for output_data in outputs:
                    out_type = output_data.get("type", "text")
                    out_content = output_data.get("content", "")
                    CellOutput.objects.create(cell=db_cell, type=out_type, content=out_content)

        return JsonResponse({"status": "success", "message": "Notebook saved successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def api_delete_notebook(request, pk):
    """
    API endpoint to delete a notebook.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    notebook = get_object_or_404(Notebook, pk=pk)
    notebook.delete()
    return JsonResponse({"status": "success", "message": "Notebook deleted successfully"})
