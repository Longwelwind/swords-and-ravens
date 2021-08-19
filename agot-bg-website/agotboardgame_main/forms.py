from django.forms import ModelForm

from agotboardgame_main.models import User


class UpdateUsernameForm(ModelForm):
    class Meta:
        model = User
        fields = ["username"]


class UpdateSettingsForm(ModelForm):
    class Meta:
        model = User
        fields = ["email_notification_active", "mute_games", "use_map_scrollbar", "use_house_names_for_chat", "use_responsive_layout_on_mobile"]
        labels = {
            "email_notification_active": "PBEM Notifications",
            "mute_games": "Join games in the muted state",
            "use_house_names_for_chat": "Use house names for ingame chat",
            "use_map_scrollbar": "Join games by using the map scrollbar",
            "use_responsive_layout_on_mobile": "Use a responsive layout on mobile devices"
        }