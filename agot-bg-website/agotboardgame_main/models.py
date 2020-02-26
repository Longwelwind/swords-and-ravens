import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import JSONField
from django.core.validators import RegexValidator, MinLengthValidator
from django.db import models
from django.utils.crypto import get_random_string
from django.utils.translation import gettext_lazy as _

IN_LOBBY = "IN_LOBBY"
CLOSED = "CLOSED"
ONGOING = "ONGOING"
FINISHED = "FINISHED"


def generate_game_token():
    return get_random_string(length=32)


class User(AbstractUser):
    username_validator = RegexValidator(regex=r'^[\w.-]+\Z')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    username = models.CharField(
        _('username'),
        max_length=18,
        unique=True,
        help_text=_('Between 3 and 18 characters. Letters, digits and ./-/_ only.'),
        validators=[MinLengthValidator(3), username_validator],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    game_token = models.TextField(default=generate_game_token)
    last_username_update_time = models.DateTimeField(default=None, null=True, blank=True)

    def can_update_username(self):
        return self.last_username_update_time is None


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

    class Meta:
        permissions = [
            ("can_play_as_another_player", "Can impersonate an other player in a game")
        ]


class PlayerInGame(models.Model):
    game = models.ForeignKey(Game, related_name='players', on_delete=models.CASCADE)
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    data = JSONField()
