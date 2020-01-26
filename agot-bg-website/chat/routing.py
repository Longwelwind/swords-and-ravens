from django.urls import path

from chat import consumers

websocket_urlpatterns = [
    path('ws/chat/room/<uuid:room_id>', consumers.ChatConsumer),
]
