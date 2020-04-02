from django.forms import ModelForm

from agotboardgame_main.models import User


class UpdateUsernameForm(ModelForm):
    class Meta:
        model = User
        fields = ["username"]


class UpdateSettingsForm(ModelForm):
    class Meta:
        model = User
        fields = ["email_notification_active"]
        labels = {
            "email_notification_active": "PBEM Notifications"
        }