import django.utils.timezone
from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.serializers import ModelSerializer, BooleanField, SerializerMethodField

from agotboardgame_main.models import User, Group, Game, PlayerInGame, PbemResponseTime
from chat.models import Room, UserInRoom


class PbemResponseTimeSerializer(ModelSerializer):
    class Meta:
        model = PbemResponseTime
        fields = ['id', 'user', 'response_time', 'created_at']


class GroupSerializer(ModelSerializer):
    class Meta:
        model = Group
        fields = ('name',)


class UserSerializer(ModelSerializer):
    #pbem_response_times = PbemResponseTimeSerializer(many=True)
    #Don't do it that way when we request a player. Get the PBEM response times of a player on demand when the profile is openend
    groups = GroupSerializer(many=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'game_token', 'is_staff', 'mute_games', 'use_house_names_for_chat', 'use_map_scrollbar', 'use_responsive_layout_on_mobile', 'groups']


class PlayerInGameSerializer(ModelSerializer):
    user = PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = PlayerInGame
        fields = ['user', 'data']


class GameSerializer(ModelSerializer):
    players = PlayerInGameSerializer(many=True)
    update_last_active = BooleanField(required=False, default=False)

    class Meta:
        model = Game
        fields = ['id', 'name', 'owner', 'serialized_game', 'view_of_game', 'state', 'version', 'players', 'update_last_active']


    def update(self, instance, validated_data):
        instance.version = validated_data.pop('version', instance.version)
        instance.serialized_game = validated_data.pop('serialized_game', instance.serialized_game)
        instance.view_of_game = validated_data.pop('view_of_game', instance.view_of_game)
        instance.state = validated_data.pop('state', instance.state)
        if validated_data.pop('update_last_active', False):
            instance.last_active_at = django.utils.timezone.now()

        instance.players.all().delete()

        players_data = validated_data.pop('players')
        for player_data in players_data:
            PlayerInGame.objects.create(game=instance, **player_data)

        instance.save()

        return instance


class GameViewSerializer(ModelSerializer):
    """Read-only serializer for public API access to view_of_game"""
    view_of_game = SerializerMethodField()
    
    class Meta:
        model = Game
        fields = ['id', 'name', 'view_of_game', 'state']
    
    def get_view_of_game(self, obj):
        """Return sanitized view_of_game with sensitive data removed"""
        if obj.view_of_game is None:
            return None
        
        # Create a copy to avoid modifying the original
        sanitized_view = obj.view_of_game.copy()
        
        # Remove sensitive fields
        sanitized_view.pop('replacerIds', None)
        sanitized_view.pop('oldPlayerIds', None)
        sanitized_view.pop('waitingForIds', None)
        sanitized_view.pop('publicChatRoomId', None)
        sanitized_view.pop('timeoutPlayerIds', None)
        
        # Rename 'turn' to 'round'
        if 'turn' in sanitized_view:
            sanitized_view['round'] = sanitized_view.pop('turn')
        
        return sanitized_view


class UserInRoomSerializer(ModelSerializer):
    user = PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = UserInRoom
        fields = ['user']


class RoomSerializer(ModelSerializer):
    users = UserInRoomSerializer(many=True)

    class Meta:
        model = Room
        fields = ['id', 'name', 'public', 'max_retrieve_count', 'users']

    def create(self, validated_data):
        room = Room(
            name=validated_data.pop('name'),
            public=validated_data.pop('public'),
            max_retrieve_count=validated_data.pop('max_retrieve_count')
        )

        room.save()

        users_data = validated_data.pop('users')
        for user_data in users_data:
            UserInRoom.objects.create(room=room, **user_data)

        return room