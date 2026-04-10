import logging
from datetime import datetime, timezone, timedelta

from agotboardgame_main.models import Game
from django.core.mail import send_mail
from django.core.cache import cache
from django.template.loader import render_to_string
from agotboardgame.settings import DEFAULT_FROM_MAIL
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db.models import Q

CONNECTED_USER_STALE_AFTER = timedelta(hours=1)
INTERNAL_KEYS = {'_count', '_last_active_at'}

from chat.models import Room, Message, UserInRoom
from agotboardgame_main.views import get_public_room_id

logger = logging.getLogger(__name__)


def get_connected_users_cache_key(room_id):
    """Get cache key for storing connected users in a room."""
    return f'chat_room_{room_id}_connected_users'


def _prune_stale(connected_users):
    """Remove entries that have no _last_active_at or are older than CONNECTED_USER_STALE_AFTER.
    Returns the list of pruned user ID strings."""
    cutoff = datetime.now(timezone.utc) - CONNECTED_USER_STALE_AFTER
    stale = [
        uid for uid, data in connected_users.items()
        if not data.get('_last_active_at') or
           datetime.fromisoformat(data['_last_active_at']) < cutoff
    ]
    for uid in stale:
        connected_users.pop(uid)
    return stale


def add_connected_user(room_id, user_id, user_data):
    """Add a user to the connected users list for a room.

    Args:
        room_id: The room ID
        user_id: User ID
        user_data: Dict with keys: username, is_admin, is_high_member, last_won_tournament
    """
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    user_id_str = str(user_id)
    now = datetime.now(timezone.utc).isoformat()
    if user_id_str in connected_users:
        # User already tracked (multiple tabs); increment the connection count and refresh timestamp
        connected_users[user_id_str]['_count'] = connected_users[user_id_str].get('_count', 1) + 1
        connected_users[user_id_str]['_last_active_at'] = now
    else:
        entry = dict(user_data)
        entry['_count'] = 1
        entry['_last_active_at'] = now
        connected_users[user_id_str] = entry
    cache.set(cache_key, connected_users, None)  # No expiration; staleness handled per-entry
    return connected_users


def remove_connected_user(room_id, user_id):
    """Remove a user from the connected users list for a room."""
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    user_id_str = str(user_id)
    if user_id_str in connected_users:
        count = max(0, connected_users[user_id_str].get('_count', 1) - 1)
        if count == 0:
            connected_users.pop(user_id_str)
        else:
            connected_users[user_id_str]['_count'] = count
    cache.set(cache_key, connected_users, None)
    return connected_users


def get_connected_users(room_id):
    """Get the list of connected users for a room, pruning stale entries.
    Returns (connected_users_dict, pruned_user_ids)."""
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    pruned_uids = []
    if connected_users:
        pruned_uids = _prune_stale(connected_users)
        if pruned_uids:
            cache.set(cache_key, connected_users, None)
    return connected_users, pruned_uids


def refresh_last_active_at(room_id, user_id):
    """Refresh the _last_active_at timestamp for a connected user."""
    cache_key = get_connected_users_cache_key(room_id)
    connected_users = cache.get(cache_key, {})
    user_id_str = str(user_id)
    if user_id_str in connected_users:
        connected_users[user_id_str]['_last_active_at'] = datetime.now(timezone.utc).isoformat()
        cache.set(cache_key, connected_users, None)

class ChatConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id = None
        self.room_public = False
        self.room_name = None
        self.room_max_retrieve_count = None
        self.user_in_room_id = None

    async def connect(self):
        user = self.scope['user']
        room_id = self.scope['url_route']['kwargs']['room_id']

        if not user.is_authenticated:
            await self.close()
            return

        # Check if the channel exists - only load minimal fields
        try:
            room = await database_sync_to_async(lambda: Room.objects.only('id', 'public', 'name', 'max_retrieve_count').get(id=room_id))()
        except Room.DoesNotExist:
            await self.close()
            return

        # Store only necessary data, not the full object
        self.room_id = str(room.id)
        self.room_public = room.public
        self.room_name = room.name
        self.room_max_retrieve_count = room.max_retrieve_count

        user_in_room = await database_sync_to_async(lambda: UserInRoom.objects.filter(user=user, room_id=room_id).only('id').first())()

        # Check if the user has access to this channel
        if not self.room_public and not user_in_room:
            await self.close()
            return

        # Always create a UserInRoom entity for each user that connected to this channel
        if not user_in_room:
            user_in_room = await database_sync_to_async(lambda: UserInRoom.objects.create(user=user, room_id=room_id))()

        self.user_in_room_id = user_in_room.id

        # Join room group
        await self.channel_layer.group_add(
            self.room_id,
            self.channel_name
        )

        await self.accept()

        # Only track connected users for the website's public games chat room
        if self.room_public and self.room_name == 'public':
            user_data = await database_sync_to_async(self.get_user_data)(user)
            await database_sync_to_async(lambda: add_connected_user(
                self.room_id,
                str(user.id),
                user_data
            ))()
            # Broadcast updated user list to all connected clients
            await self.broadcast_connected_users()

    async def disconnect(self, close_code):
        # Leave room group
        if self.room_id is not None:
            # Only track connected users for the website's public games chat room
            if self.room_public and self.room_name == 'public':
                user = self.scope['user']
                await database_sync_to_async(lambda: remove_connected_user(
                    self.room_id,
                    str(user.id)
                ))()
                # Broadcast updated user list to remaining clients
                await self.broadcast_connected_users()

            await self.channel_layer.group_discard(
                self.room_id,
                self.channel_name
            )

    async def receive_json(self, data):
        user = self.scope['user']
        type = data['type']

        if type == 'chat_message':
            text = data['text']
            faceless = data['faceless']

            if not text:
                logger.warning(f'A user tried to send an empty message to room "{self.room_id}"')
                return

            if len(text) > 200:
                logger.warning(f'A user tried to send a too long message to room ({self.room_id}')
                return

            if not user.is_authenticated:
                logger.warning(f'An unauthenticated user tried to send the message "{text}" to room "{self.room_id}"')
                return

            message = Message()
            message.user = user
            message.text = text
            message.room_id = self.room_id
            await database_sync_to_async(lambda: message.save())()

            await self.channel_layer.group_send(
                self.room_id,
                {
                    'type': 'chat_message',
                    'id': message.id,
                    'text': message.text,
                    'user_id': str(message.user.id),
                    'user_username': '' if faceless else user.username,
                    'created_at': message.created_at.isoformat()
                }
            )

            if self.room_public and self.room_name in ('public', 'issues'):
                # Refresh activity in the public room (where online tracking lives)
                # for both the public and issues channels shown on the main pages.
                public_room_id = await database_sync_to_async(get_public_room_id)()
                await database_sync_to_async(lambda: refresh_last_active_at(public_room_id, str(user.id)))()

            if self.room_public:
                return

            # notify the other user about a new private message

            await database_sync_to_async(lambda: self.notify_chat_partner(user, message, data['gameId'], data['fromHouse']))()
        elif type == 'chat_view_message':
            message_id = data['message_id']

            if not self.user_in_room_id:
                logger.warning(f'An unauthenticated used tried to mark a message as viewed in room "{self.room_id}"')

            message = await database_sync_to_async(lambda: Message.objects.only('id').get(id=message_id))()

            if not message:
                logger.warning(f'A user tried to mark a non-existent message (id: {message_id}) as viewed (user_in_room_id: {self.user_in_room_id})')

            await database_sync_to_async(lambda: UserInRoom.objects.filter(id=self.user_in_room_id).update(last_viewed_message_id=message.id))()
        elif type == 'chat_retrieve':
            count = data['count']
            first_message_id = data['first_message_id']
            faceless = data['faceless']

            if first_message_id is not None:
                first_message = await database_sync_to_async(lambda: Message.objects.only('id', 'created_at').get(id=first_message_id))()
                first_message_created_at = first_message.created_at
            else:
                first_message_created_at = None

            if self.room_max_retrieve_count is not None:
                count = min(self.room_max_retrieve_count, count)

            messages = await database_sync_to_async(lambda: self.get_and_transform_messages(count, first_message_created_at, faceless))()

            # Also include the last message viewed in the response
            last_viewed_message_id = None
            if first_message_id is None and self.user_in_room_id:
                user_in_room = await database_sync_to_async(lambda: UserInRoom.objects.only('last_viewed_message_id').get(id=self.user_in_room_id))()
                last_viewed_message_id = user_in_room.last_viewed_message_id

            await self.send_json({
                'type': 'chat_messages_retrieved' if first_message_id is None else 'more_chat_messages_retrieved',
                'messages': messages,
                'last_viewed_message': last_viewed_message_id
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
        # Only select the fields we need, prefetch user with only needed fields
        if first_message_created_at is None:
            messages = Message.objects.filter(room_id=self.room_id).select_related('user').only('id', 'text', 'created_at', 'user__id', 'user__username').order_by('-created_at')[0:count:-1]
        else:
            messages = Message.objects.filter(Q(room_id=self.room_id) & Q(created_at__lt=first_message_created_at)).select_related('user').only('id', 'text', 'created_at', 'user__id', 'user__username').order_by('-created_at')[:count]

        return [{
                    'id': message.id,
                    'text': message.text,
                    'user_id': str(message.user.id),
                    'user_username': '' if faceless else message.user.username,
                    'created_at': message.created_at.isoformat()
                 } for message in messages]

    def notify_chat_partner(self, user, message, game_id, from_house):
        game = Game.objects.only('id', 'name', 'view_of_game').get(id=game_id)
        pbem_active = game.view_of_game.get("settings", False) and game.view_of_game.get("settings").get("pbem", False) == True
        if not pbem_active:
            return
        #print("from " + user.username)
        other_user_in_room = UserInRoom.objects.filter(room_id=self.room_id).exclude(user=user).select_related('user').only('id', 'user__id', 'user__email', 'user__email_notification_active').first()
        if other_user_in_room is None or not other_user_in_room.user.email_notification_active:
            return

        #print("to " + other_user_in_room.user.username)

        user_already_notified = cache.has_key(f'{self.room_id}_{other_user_in_room.user.id}')
        if not user_already_notified:
            mailBody = render_to_string('agotboardgame_main/new_private_message_notification.html',
                {'message': message.text, 'receiver': other_user_in_room.user, 'sender': user, 'game': game,
                'game_url': f'https://swordsandravens.net/play/{game.id}', 'from_house': from_house })
            cache.set(f'{self.room_id}_{other_user_in_room.user.id}', True, 7 * 60)
            send_mail(f'You received a new private message in game: \'{game.name}\'',
                mailBody,
                DEFAULT_FROM_MAIL,
                [other_user_in_room.user.email],
                True)
            #print (mailBody)

    async def broadcast_connected_users(self):
        """Broadcast the current list of connected users to all clients in the room."""
        if not self.room_public or self.room_name != 'public':
            return

        connected_users, pruned_uids = await database_sync_to_async(lambda: get_connected_users(self.room_id))()

        if pruned_uids:
            await self.channel_layer.group_send(
                self.room_id,
                {
                    'type': 'close_stale_connections',
                    'user_ids': pruned_uids
                }
            )

        # Strip internal bookkeeping fields before sending to clients
        users_to_send = {
            uid: {k: v for k, v in data.items() if k not in INTERNAL_KEYS}
            for uid, data in connected_users.items()
        }

        await self.channel_layer.group_send(
            self.room_id,
            {
                'type': 'connected_users_update',
                'users': users_to_send
            }
        )

    async def connected_users_update(self, event):
        """Send connected users update to the client."""
        users = event['users']
        await self.send_json({
            'type': 'connected_users',
            'users': users
        })

    async def close_stale_connections(self, event):
        """Tell the client to disconnect if this consumer's user was pruned as stale.
        The client's disconnectAll() will close both the public and issues WebSockets,
        triggering a clean server-side disconnect() for each."""
        user = self.scope['user']
        if user.is_authenticated and str(user.id) in event['user_ids']:
            await self.send_json({'type': 'force_disconnect'})

    def get_user_data(self, user):
        """Get enriched user data including admin status and tournament wins.
        
        Uses caching to avoid repeated database queries for the same user.
        Cache expires after 5 minutes.
        """
        cache_key = f'user_data_{user.id}'
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            return cached_data
        
        from agotboardgame_main.models import User
        
        # Load only the fields we need with groups prefetched in a single query
        user_data = User.objects.filter(id=user.id).prefetch_related('groups').only(
            'id', 'username', 'last_won_tournament'
        ).first()
        
        if not user_data:
            result = {
                'username': user.username,
                'is_admin': False,
                'is_high_member': False,
                'last_won_tournament': None
            }
        else:
            # Check groups from the prefetched data (no additional queries)
            group_names = {g.name for g in user_data.groups.all()}
            is_admin = "Admin" in group_names
            is_high_member = "High Member" in group_names and not is_admin
            
            result = {
                'username': user_data.username,
                'is_admin': is_admin,
                'is_high_member': is_high_member,
                'last_won_tournament': user_data.last_won_tournament
            }
        
        # Cache for 5 minutes
        cache.set(cache_key, result, 300)
        return result
