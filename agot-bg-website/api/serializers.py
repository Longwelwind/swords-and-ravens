from rest_framework.relations import PrimaryKeyRelatedField
from rest_framework.serializers import ModelSerializer

from agotboardgame_main.models import User, Game, PlayerInGame


class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'game_token', 'is_staff']


class PlayerInGameSerializer(ModelSerializer):
    user = PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = PlayerInGame
        fields = ['user', 'data']


class GameSerializer(ModelSerializer):
    players = PlayerInGameSerializer(many=True)

    class Meta:
        model = Game
        fields = ['id', 'name', 'owner', 'serialized_game', 'view_of_game', 'state', 'version', 'players']

    def update(self, instance, validated_data):
        instance.version = validated_data.pop('version', instance.version)
        instance.serialized_game = validated_data.pop('serialized_game', instance.serialized_game)
        instance.view_of_game = validated_data.pop('view_of_game', instance.view_of_game)
        instance.state = validated_data.pop('state', instance.state)

        instance.players.all().delete()

        players_data = validated_data.pop('players')
        for player_data in players_data:
            PlayerInGame.objects.create(game=instance, **player_data)

        instance.save()

        return instance
