from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0007_chat_models'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('info', 'Info'),
                    ('assignment', 'Assignment'),
                    ('comment', 'Comment'),
                    ('status_change', 'Status Change'),
                    ('sprint', 'Sprint'),
                    ('system', 'System'),
                    ('chat', 'Chat'),
                ],
                default='info',
                max_length=32,
            ),
        ),
    ]
