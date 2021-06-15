from django.urls import path, include
from rest_framework.routers import SimpleRouter

from api import views

router = SimpleRouter(trailing_slash=False)
router.register(r'user', views.UserViewSet)
router.register(r'game', views.GameViewSet)
router.register(r'room', views.RoomViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('notifyReadyToStart/<uuid:game_id>', views.notify_ready_to_start),
    path('notifyYourTurn/<uuid:game_id>', views.notify_your_turn),
    path('notifyBattleResults/<uuid:game_id>', views.notify_battle_results),
    path('notifyNewVote/<uuid:game_id>', views.notify_new_vote),
    path('notifyGameEnded/<uuid:game_id>', views.notify_game_ended)
]
