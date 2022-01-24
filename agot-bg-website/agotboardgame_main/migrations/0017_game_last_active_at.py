from django.db import migrations, models
import django.utils.timezone
from agotboardgame_main.models import Game

def reset_last_active_at_to_updated_at(apps, schema_editor):
    for game in Game.objects.all():
        game.last_active_at = game.updated_at

def reverse(apps, schema_editor):
    # Too lazy to actually code this, no-one's gonna use it anyway.
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('agotboardgame_main', '0016_game_last_active_at'),
    ]

    operations = [
        migrations.RunPython(reset_last_active_at_to_updated_at, reverse)
    ]