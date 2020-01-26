from django.db import migrations, models
import django.db.models.deletion


def create_public_room(apps, schema_editor):
    Room = apps.get_model('chat', 'Room')
    db_alias = schema_editor.connection.alias
    Room.objects.using(db_alias).bulk_create([
        Room(name='public', public=True, max_retrieve_count=10)
    ])


def delete_public_room(apps, schema_editor):
    Room = apps.get_model('chat', 'Room')
    db_alias = schema_editor.connection.alias

    Room.objects.using(db_alias).filter(name='public').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('agotboardgame_main', '0003_auto_20200120_1446'),
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='playeringame',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='players', to='agotboardgame_main.Game'),
        ),
        migrations.RunPython(create_public_room, delete_public_room)
    ]
