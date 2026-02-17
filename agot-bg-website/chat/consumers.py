import logging

from agotboardgame_main.models import Game
from django.core.mail import send_mail
from django.core.cache import cache
from django.template.loader import render_to_string
from agotboardgame.settings import DEFAULT_FROM_MAIL
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db.models import Q

from chat.models import Room, Message, UserInRoom

logger = logging.getLogger(__name__)


def get_connected_users_cache_key(room_id):
    """Get cache key for storing connected users in a room."""
    return f'chat_room_{room_id}_connected_users'


def add_connected_user(room_id, user_id, user_data):
    """Add a user to the connected users list for a room.
    
    Args:
        room_id: The room ID
        user_id: User ID
        user_data: Dict with keys: username, is_admin, is_high_member, last_won_tournament
    """
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    connected_users[str(user_id)] = user_data
    cache.set(cache_key, connected_users, None)  # No expiration
    return connected_users


def remove_connected_user(room_id, user_id):
    """Remove a user from the connected users list for a room."""
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    connected_users.pop(str(user_id), None)
    cache.set(cache_key, connected_users, None)
    return connected_users


def get_connected_users(room_id):
    """Get the list of connected users for a room."""
    cache_key = get_connected_users_cache_key(room_id)
    return cache.get(cache_key, {})

class ChatConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room = None
        self.user_in_room = None

    async def connect(self):
        user = self.scope['user']
        room_id = self.scope['url_route']['kwargs']['room_id']

        if not user.is_authenticated:
            await self.close()
            return

        # Check if the channel exists
        try:
            room = await database_sync_to_async(lambda: Room.objects.get(id=room_id))()
        except Room.DoesNotExist:
            await self.close()
            return

        self.user_in_room = await database_sync_to_async(lambda: room.users.prefetch_related('last_viewed_message').filter(user=user).first())()

        # Check if the user has access to this channel
        if not room.public and not self.user_in_room:
            await self.close()
            return

        # Always create a UserInRoom entity for each user that connected to this channel
        if not self.user_in_room:
            self.user_in_room = await database_sync_to_async(lambda: UserInRoom.objects.create(user=user, room=room))()

        self.room = room

        # Join room group
        await self.channel_layer.group_add(
            str(self.room.id),
            self.channel_name
        )

        await self.accept()

        # Only track connected users for the website's public games chat room
        if self.room.public and self.room.name == 'public':
            user_data = await database_sync_to_async(self.get_user_data)(user)
            await database_sync_to_async(lambda: add_connected_user(
                str(self.room.id),
                str(user.id),
                user_data
            ))()
            # Broadcast updated user list to all connected clients
            await self.broadcast_connected_users()

    async def disconnect(self, close_code):
        # Leave room group
        if self.room is not None:
            # Only track connected users for the website's public games chat room
            if self.room.public and self.room.name == 'public':
                user = self.scope['user']
                if user.is_authenticated:
                    await database_sync_to_async(lambda: remove_connected_user(
                        str(self.room.id),
                        str(user.id)
                    ))()
                    # Broadcast updated user list to remaining clients
                    await self.broadcast_connected_users()

            await self.channel_layer.group_discard(
                str(self.room.id),
                self.channel_name
            )

    async def receive_json(self, data):
        user = self.scope['user']
        type = data['type']

        if type == 'chat_message':
            text = data['text']
            faceless = data['faceless']

            if not text:
                logger.warning(f'A user tried to send an empty message to room "{self.room.id}"')
                return

            if len(text) > 200:
                logger.warning(f'A user tried to send a too long message to room ({self.room.id}')
                return

            if not user.is_authenticated:
                logger.warning(f'An unauthenticated user tried to send the message "{text}" to room "{self.room.id}"')
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
                    'id': message.id,
                    'text': message.text,
                    'user_id': str(message.user.id),
                    'user_username': '' if faceless else user.username,
                    'created_at': message.created_at.isoformat()
                }
            )

            if self.room.public:
                return

            # notify the other user about a new private message

            await database_sync_to_async(lambda: self.notify_chat_partner(user, message, data['gameId'], data['fromHouse']))()
        elif type == 'chat_view_message':
            message_id = data['message_id']

            if not self.user_in_room:
                logger.warning(f'An unauthenticated used tried to mark a message as viewed in room "{self.room.id}"')

            message = await database_sync_to_async(lambda: Message.objects.get(id=message_id))()

            if not message:
                logger.warning(f'A user tried to mark a non-existent message (id: {message_id}) as viewed (user_id: {self.user_in_room.user.id})')

            self.user_in_room.last_viewed_message = message

            await database_sync_to_async(lambda: self.user_in_room.save())()
        elif type == 'chat_retrieve':
            count = data['count']
            first_message_id = data['first_message_id']
            faceless = data['faceless']

            if first_message_id is not None:
                first_message = await database_sync_to_async(lambda: Message.objects.get(id=first_message_id))()
                first_message_created_at = await database_sync_to_async(lambda: first_message.created_at)()
            else:
                first_message_created_at = None

            if self.room.max_retrieve_count is not None:
                count = min(self.room.max_retrieve_count, count)

            messages = await database_sync_to_async(lambda: self.get_and_transform_messages(count, first_message_created_at, faceless))()

            # Also include the last message viewed in the response
            last_viewed_message = self.user_in_room.last_viewed_message if first_message_id is None and self.user_in_room else None

            await self.send_json({
                'type': 'chat_messages_retrieved' if first_message_id is None else 'more_chat_messages_retrieved',
                'messages': messages,
                'last_viewed_message': last_viewed_message.id if last_viewed_message else None
            })

    async def chat_message(self, event):
        text = event['text']
        id = event['id']
        user_id = event['user_id']
        user_username = event['user_username']
        created_at = event['created_at']

        await self.send_json({
            'type': 'chat_message',
            'id': id,
            'text': text,
            'user_id': user_id,
            'user_username': user_username,
            'created_at': created_at
        })

    def get_and_transform_messages(self, count, first_message_created_at, faceless):
        if first_message_created_at is None:
            messages = Message.objects.filter(room=self.room).prefetch_related('user').order_by('-created_at')[0:count:-1]
        else:
            messages = Message.objects.filter(Q(room=self.room) & Q(created_at__lt=first_message_created_at)).prefetch_related('user').order_by('-created_at')[:count]

        return [{
                    'id': message.id,
                    'text': message.text,
                    'user_id': str(message.user.id),
                    'user_username': '' if faceless else message.user.username,
                    'created_at': message.created_at.isoformat()
                 } for message in messages]

    def notify_chat_partner(self, user, message, game_id, from_house):
        game = Game.objects.get(id=game_id)
        pbem_active = game.view_of_game.get("settings", False) and game.view_of_game.get("settings").get("pbem", False) == True
        if not pbem_active:
            return
        #print("from " + user.username)
        other_user_in_room = self.room.users.prefetch_related('user').exclude(user=user).first()
        if other_user_in_room is None or not other_user_in_room.user.email_notification_active:
            return

        #print("to " + other_user_in_room.user.username)

        user_already_notified = cache.has_key(f'{self.room.id}_{other_user_in_room.user.id}')
        if not user_already_notified:
            mailBody = render_to_string('agotboardgame_main/new_private_message_notification.html',
                {'message': message.text, 'receiver': other_user_in_room.user, 'sender': user, 'game': game,
                'game_url': f'https://swordsandravens.net/play/{game.id}', 'from_house': from_house })
            cache.set(f'{self.room.id}_{other_user_in_room.user.id}', True, 7 * 60)
            send_mail(f'You received a new private message in game: \'{game.name}\'',
                mailBody,
                DEFAULT_FROM_MAIL,
                [other_user_in_room.user.email],
                True)
            #print (mailBody)

    async def broadcast_connected_users(self):
        """Broadcast the current list of connected users to all clients in the room."""
        if not self.room or not self.room.public or self.room.name != 'public':
            return

        connected_users = await database_sync_to_async(lambda: get_connected_users(str(self.room.id)))()

        await self.channel_layer.group_send(
            str(self.room.id),
            {
                'type': 'connected_users_update',
                'users': connected_users
            }
        )

    async def connected_users_update(self, event):
        """Send connected users update to the client."""
        users = event['users']
        await self.send_json({
            'type': 'connected_users',
            'users': users
        })

    def get_user_data(self, user):
        """Get enriched user data including admin status and tournament wins."""
        is_admin = user.is_in_group("Admin")
        is_high_member = user.is_in_group("High Member")
        
        return {
            'username': user.username,
            'is_admin': is_admin,
            'is_high_member': is_high_member if not is_admin else False,
            'last_won_tournament': user.last_won_tournament if hasattr(user, 'last_won_tournament') else None
        }
