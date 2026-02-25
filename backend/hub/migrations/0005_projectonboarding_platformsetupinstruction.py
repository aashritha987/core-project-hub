from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import hub.models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0004_remove_issue_story_points'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectOnboarding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uid', models.CharField(default=hub.models.onboarding_uid, max_length=32, unique=True)),
                ('overview', models.TextField(blank=True, default='')),
                ('repository_url', models.URLField(blank=True, default='')),
                ('prerequisites', models.TextField(blank=True, default='')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_onboarding_guides', to=settings.AUTH_USER_MODEL)),
                ('project', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='onboarding', to='hub.project')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_onboarding_guides', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='PlatformSetupInstruction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uid', models.CharField(default=hub.models.platform_instruction_uid, max_length=32, unique=True)),
                ('platform', models.CharField(choices=[('windows', 'Windows'), ('linux', 'Linux'), ('macos', 'macOS'), ('other', 'Other')], max_length=16)),
                ('title', models.CharField(max_length=255)),
                ('content', models.TextField()),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_platform_instructions', to=settings.AUTH_USER_MODEL)),
                ('onboarding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='instructions', to='hub.projectonboarding')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_platform_instructions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['platform', 'display_order', 'created_at'],
            },
        ),
    ]
