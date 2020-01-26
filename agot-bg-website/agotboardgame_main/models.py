import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.utils.crypto import get_random_string

IN_LOBBY = "IN_LOBBY"
CLOSED = "CLOSED"
ONGOING = "ONGOING"
FINISHED = "FINISHED"


def generate_game_token():
    return get_random_string(length=32)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    game_token = models.TextField(default=generate_game_token)


class Game(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    view_of_game = JSONField(null=True, default=None, blank=True)
    serialized_game = JSONField(null=True, default=None, blank=True)
    version = models.TextField(null=True, default=None, blank=True)
    state = models.TextField(default=IN_LOBBY)

    def is_in_game(self, user):
        return user in self.players.all()

    def __str__(self):
        return f"{self.name} ({self.id})"


class PlayerInGame(models.Model):
    game = models.ForeignKey(Game, related_name='players', on_delete=models.CASCADE)
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    data = JSONField()
