from django.db import migrations
from agotboardgame_main.models import User


class Migration(migrations.Migration):
    def reset_use_house_names_for_chat_for_all_users(apps, schema_editor):
        for user in User.objects.all():
            user.use_house_names_for_chat = False
            user.save()

    def reverse(apps, schema_editor):
        # Too lazy to actually code this, no-one's gonna use it anyway.
        pass

    dependencies = [
        ('agotboardgame_main', '0018_pbem_response_times'),
    ]

    operations = [
        migrations.RunPython(reset_use_house_names_for_chat_for_all_users, reverse)
    ]
