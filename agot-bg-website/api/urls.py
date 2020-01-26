from django.urls import path, include
from rest_framework.routers import SimpleRouter

from api import views

router = SimpleRouter(trailing_slash=False)
router.register(r'user', views.UserViewSet)
router.register(r'game', views.GameViewSet)
router.register(r'room', views.RoomViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('notify/<uuid:game_id>', views.notify),
]
