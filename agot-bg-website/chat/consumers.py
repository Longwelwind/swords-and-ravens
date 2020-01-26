import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from chat.models import Room, Message

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        room_id = self.scope['url_route']['kwargs']['room_id']

        # Check if the channel exists
        try:
            room = await database_sync_to_async(lambda: Room.objects.get(id=room_id))()
        except Room.DoesNotExist:
            await self.close()
            return

        # Check if the user has access to this channel
        if not room.public:
            if not user.is_authenticated:
                await self.close()
                return

            # TODO: There's probably a more efficient way of checking if there is a UserInRoom
            # entry for this user.
            users = await database_sync_to_async(lambda: room.users.all())()
            if user not in users:
                await self.close()
                return

        self.room = room

        # Join room group
        await self.channel_layer.group_add(
            str(self.room.id),
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            str(self.room.id),
            self.channel_name
        )

    async def receive_json(self, data):
        user = self.scope['user']
        type = data['type']
        if type == 'chat_message':
            text = data['text']

            if not text:
                logger.warning(f'A user tried to send an empty message to room "{self.room.id}"')
                return

            if not user.is_authenticated:
                logger.warning(f'An unauthenticated user tried to send the message "${text}" to room "{self.room.id}"')
                return

            message = Message()
            message.user = user
            message.text = text
            message.room = self.room
            await database_sync_to_async(lambda: message.save())()

            await self.channel_layer.group_send(
                str(self.room.id),
                {
                    'type': 'chat_message',
                    'text': message.text,
                    'user_id': str(message.user.id),
                    'user_username': user.username,
                    'created_at': message.created_at.isoformat()
                }
            )
        elif type == 'chat_retrieve':
            count = count = data['count']

            if self.room.max_retrieve_count is not None:
                count = min(self.room.max_retrieve_count, count)

            messages = await database_sync_to_async(
                lambda: reversed(Message.objects.filter(room=self.room).prefetch_related('user').order_by('-created_at')[:count])
            )()

            await self.send_json({
                'type': 'chat_messages_retrieved',
                'messages': [
                    {'text': message.text, 'user_id': str(message.user.id), 'user_username': message.user.username, 'created_at': message.created_at.isoformat()}
                    for message in messages
                ]
            })

    async def chat_message(self, event):
        text = event['text']
        user_id = event['user_id']
        user_username = event['user_username'];
        created_at = event['created_at']

        await self.send_json({
            'type': 'chat_message',
            'text': text,
            'user_id': user_id,
            'user_username': user_username,
            'created_at': created_at
        })
