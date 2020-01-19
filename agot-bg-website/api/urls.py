from django.urls import path, include
from rest_framework.routers import SimpleRouter

from api import views

router = SimpleRouter()
router.register(r'user', views.UserViewSet)
router.register(r'game', views.GameViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('notify/<uuid:game_id>', views.notify),
]
