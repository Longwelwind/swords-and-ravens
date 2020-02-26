from django.forms import ModelForm

from agotboardgame_main.models import User


class UpdateUsernameForm(ModelForm):
    class Meta:
        model = User
        fields = ["username"]
