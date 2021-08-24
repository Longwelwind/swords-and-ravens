import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser, Group
from django.contrib.postgres.fields import JSONField
from django.core.validators import RegexValidator, MinLengthValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string
from django.utils.translation import gettext_lazy as _

IN_LOBBY = "IN_LOBBY"
CLOSED = "CLOSED"
ONGOING = "ONGOING"
FINISHED = "FINISHED"
CANCELLED = "CANCELLED"


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
    last_activity = models.DateTimeField(auto_now_add=True, blank=True)
    email_notification_active = models.BooleanField(default=True)
    vanilla_forum_user_id = models.IntegerField(default=0)
    mute_games = models.BooleanField(default=False)
    use_house_names_for_chat = models.BooleanField(default=True)
    use_map_scrollbar = models.BooleanField(default=True)
    use_responsive_layout_on_mobile = models.BooleanField(default=False)

    def is_in_group(self, group_name):
        return self.groups.filter(name=group_name).exists()

    def can_update_username(self):
        return self.last_username_update_time is None


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if settings.DEFAULT_GROUP and created:
        group = Group.objects.get(name="Member")
        group.user_set.add(instance)


@receiver(post_save, sender=get_user_model())
def create_account_vanilla_forum(sender, instance, created, **kwargs):
    if settings.VANILLA_FORUM_API_KEY and created:
        pass


def generate_default_view_of_game():
    # Before the game is loaded on the game server, the view of game will be empty, which will create weird
    # display on the Games page. A default value is created here, which will be replaced by the game server
    # when the game is loaded there.
    return {
        "maxPlayerCount": 6,
        "settings": {
            "pbem": False
        }
    }


class Game(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    view_of_game = JSONField(null=True, default=generate_default_view_of_game, blank=True)
    serialized_game = JSONField(null=True, default=None, blank=True)
    version = models.TextField(null=True, default=None, blank=True)
    state = models.TextField(default=IN_LOBBY)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_in_game(self, user):
        return user in self.players.all()

    def __str__(self):
        return f"{self.name} ({self.id})"

    class Meta:
        permissions = [
            ("can_play_as_another_player", "Can impersonate an other player in a game"),
            ("cancel_game", "Can cancel a game")
        ]


class PlayerInGame(models.Model):
    game = models.ForeignKey(Game, related_name='players', on_delete=models.CASCADE)
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    data = JSONField()
