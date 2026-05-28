from django.shortcuts import render


def index(request):
    """Renders the high-fidelity microfrontend shell mounting page."""
    return render(request, "index.html")
