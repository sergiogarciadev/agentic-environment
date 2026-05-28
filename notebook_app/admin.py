from django.contrib import admin

from .models import CellOutput, Notebook, NotebookCell


class CellOutputInline(admin.TabularInline):
    model = CellOutput
    extra = 0
    fields = ("type", "content")
    readonly_fields = ("created_at",)


class NotebookCellInline(admin.TabularInline):
    model = NotebookCell
    extra = 0
    fields = ("order", "code")
    ordering = ("order",)


@admin.register(Notebook)
class NotebookAdmin(admin.ModelAdmin):
    list_display = ("name", "cell_count", "created_at", "updated_at")
    search_fields = ("name",)
    inlines = [NotebookCellInline]

    def cell_count(self, obj):
        return obj.cells.count()

    cell_count.short_description = "Number of Cells"


@admin.register(NotebookCell)
class NotebookCellAdmin(admin.ModelAdmin):
    list_display = ("id", "notebook", "order", "code_preview")
    list_filter = ("notebook",)
    search_fields = ("code",)
    ordering = ("notebook", "order")
    inlines = [CellOutputInline]

    def code_preview(self, obj):
        if len(obj.code) > 60:
            return f"{obj.code[:57]}..."
        return obj.code

    code_preview.short_description = "Code Preview"


@admin.register(CellOutput)
class CellOutputAdmin(admin.ModelAdmin):
    list_display = ("id", "cell", "type", "content_preview", "created_at")
    list_filter = ("type",)
    search_fields = ("content",)

    def content_preview(self, obj):
        if obj.type == "image":
            return "[Base64 Image Output]"
        if len(obj.content) > 60:
            return f"{obj.content[:57]}..."
        return obj.content

    content_preview.short_description = "Content Preview"
