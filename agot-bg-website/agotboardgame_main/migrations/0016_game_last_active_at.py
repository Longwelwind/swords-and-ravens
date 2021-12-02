from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('agotboardgame_main', '0015_auto_20210821_0725'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='last_active_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]