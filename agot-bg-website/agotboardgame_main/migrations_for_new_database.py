import agotboardgame_main.models
import django.contrib.postgres.fields.jsonb
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.utils.timezone import utc
import django.utils.timezone
from django.contrib.auth.models import Group
from agotboardgame_main.models import User
from django.conf import settings
import uuid


class Migration(migrations.Migration):
    def create_default_group(apps, schema_editor):
        new_group, created = Group.objects.get_or_create(name='Member')

        for user in User.objects.all():
            new_group.user_set.add(user)

    def delete_default_group(apps, schema_editor):
        # Too lazy to actually code this, no-one's gonna use it anyway.
        pass

    def create_public_room(apps, schema_editor):
        Room = apps.get_model('chat', 'Room')
        db_alias = schema_editor.connection.alias
        Room.objects.using(db_alias).bulk_create([
            Room(name='public', public=True, max_retrieve_count=50)
        ])


    def delete_public_room(apps, schema_editor):
        Room = apps.get_model('chat', 'Room')
        db_alias = schema_editor.connection.alias

        Room.objects.using(db_alias).filter(name='public').delete()

    def vanilla_forward(apps, schema_editor):
        # Create a Vanilla forum account for all registered user
        for user in User.objects.all():
            if str(user.id) not in settings.VANILLA_IGNORED_USERS_WHEN_MIGRATING and user.vanilla_forum_user_id == 0:
                # The function was removed since the Vanilla forum integration was
                # not kept.
                pass


    def vanilla_reverse(apps, schema_editor):
        # Too lazy to actually code this, no-one's gonna use it anyway.
        pass


    dependencies = [
        ('agotboardgame_main', '0001_initial'),
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='game',
            options={'permissions': [('can_play_as_another_player', 'Can impersonate an other player in a game'), ('cancel_game', 'Can cancel a game')]},
        ),
        migrations.AddField(
            model_name='game',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='game',
            name='last_active_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='game',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='playeringame',
            name='data',
            field=django.contrib.postgres.fields.jsonb.JSONField(default={}),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='user',
            name='email_notification_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_activity',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='user',
            name='last_username_update_time',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='mute_games',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='use_house_names_for_chat',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='use_map_scrollbar',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='use_responsive_layout_on_mobile',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='vanilla_forum_user_id',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='game',
            name='view_of_game',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=agotboardgame_main.models.generate_default_view_of_game, null=True),
        ),
        migrations.AlterField(
            model_name='playeringame',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='players', to='agotboardgame_main.Game'),
        ),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Between 3 and 18 characters. Letters, digits and ./-/_ only.', max_length=18, unique=True, validators=[django.core.validators.MinLengthValidator(3), django.core.validators.RegexValidator(regex='^[\\w.-]+\\Z')], verbose_name='username'),
        ),
        migrations.CreateModel(
            name='PbemResponseTime',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ('response_time', models.IntegerField(default=-1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='user',
            name='profile_text',
            field=models.CharField(blank=True, default=None, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_won_tournament',
            field=models.CharField(blank=True, default=None, max_length=200, null=True),
        ),
        migrations.RunPython(create_default_group, delete_default_group),
        migrations.RunPython(create_public_room, delete_public_room),
        migrations.RunPython(vanilla_forward, vanilla_reverse)
    ]