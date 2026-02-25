from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0003_issueattachment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='issue',
            name='story_points',
        ),
    ]

