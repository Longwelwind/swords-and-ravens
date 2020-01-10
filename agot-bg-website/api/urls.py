from django.urls import path

from api import views

urlpatterns = [
    path('notify/<uuid:game_id>', views.notify),
]
