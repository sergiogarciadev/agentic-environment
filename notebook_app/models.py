from django.db import models


class Notebook(models.Model):
    """
    A Jupyter-like Notebook structure containing cells.
    """

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class NotebookCell(models.Model):
    """
    A cell inside a Notebook, holding executable Python code.
    """

    notebook = models.ForeignKey(Notebook, related_name="cells", on_delete=models.CASCADE)
    code = models.TextField(blank=True, default="")
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Cell {self.order} in {self.notebook.name}"


class CellOutput(models.Model):
    """
    Captured execution output for a single cell. Can be text stdout or image plots.
    """

    TYPE_CHOICES = [
        ("text", "Text"),
        ("image", "Image"),
    ]
    cell = models.ForeignKey(NotebookCell, related_name="outputs", on_delete=models.CASCADE)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    content = models.TextField()  # Raw text stdout or base64 image representation
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Output ({self.type}) for Cell {self.cell.id}"
