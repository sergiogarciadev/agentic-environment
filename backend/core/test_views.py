import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_index_view_status_code(client):
    """Verifies that the home view renders correctly (HTTP 200)."""
    url = reverse("index")
    response = client.get(url)
    assert response.status_code == 200
    assert b"Microfrontend Shell" in response.content
