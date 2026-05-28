from django.urls import path

from . import views

urlpatterns = [
    path("", views.notebook_list, name="notebook_list"),
    path("notebook/<int:pk>/", views.notebook_detail, name="notebook_detail"),
    path("api/notebooks/<int:pk>/", views.api_get_notebook, name="api_get_notebook"),
    path("api/notebooks/<int:pk>/save/", views.api_save_notebook, name="api_save_notebook"),
    path("api/notebooks/<int:pk>/delete/", views.api_delete_notebook, name="api_delete_notebook"),
]
