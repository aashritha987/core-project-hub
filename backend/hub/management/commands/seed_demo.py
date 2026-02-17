from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from hub.models import Epic, Issue, Label, Project, Sprint


class Command(BaseCommand):
    help = 'Seed demo data for project hub'

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        users_data = [
            ('Alex', 'Morgan', 'alex@company.com', 'admin123', 'admin'),
            ('Sarah', 'Chen', 'sarah@company.com', 'pm123', 'project_manager'),
            ('James', 'Wilson', 'james@company.com', 'dev123', 'developer'),
            ('Maria', 'Garcia', 'maria@company.com', 'dev123', 'developer'),
            ('David', 'Kim', 'david@company.com', 'view123', 'viewer'),
        ]

        users = {}
        for first, last, email, password, role in users_data:
            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email, 'first_name': first, 'last_name': last},
            )
            if created:
                user.set_password(password)
                user.save()
            else:
                user.email = email
                user.first_name = first
                user.last_name = last
                user.set_password(password)
                user.save()
            user.profile.role = role
            user.profile.save(update_fields=['role'])
            users[email] = user

        p1, _ = Project.objects.get_or_create(
            key='ATL',
            defaults={
                'name': 'Project Atlas',
                'description': 'Main product development project',
                'lead': users['alex@company.com'],
                'avatar': '??',
            },
        )
        p2, _ = Project.objects.get_or_create(
            key='DS',
            defaults={
                'name': 'Design System',
                'description': 'Component library and design tokens',
                'lead': users['sarah@company.com'],
                'avatar': '??',
            },
        )

        labels = {
            'frontend': Label.objects.get_or_create(project=p1, name='frontend', defaults={'color': 'blue'})[0],
            'backend': Label.objects.get_or_create(project=p1, name='backend', defaults={'color': 'green'})[0],
            'design': Label.objects.get_or_create(project=p1, name='design', defaults={'color': 'purple'})[0],
            'performance': Label.objects.get_or_create(project=p1, name='performance', defaults={'color': 'orange'})[0],
            'security': Label.objects.get_or_create(project=p1, name='security', defaults={'color': 'red'})[0],
        }

        e1, _ = Epic.objects.get_or_create(project=p1, key='ATL-E1', defaults={
            'name': 'User Authentication', 'summary': 'Complete auth system', 'color': '#6554C0', 'status': 'in_progress'
        })
        e2, _ = Epic.objects.get_or_create(project=p1, key='ATL-E2', defaults={
            'name': 'Dashboard Redesign', 'summary': 'New dashboard with analytics', 'color': '#00875A', 'status': 'in_progress'
        })
        e3, _ = Epic.objects.get_or_create(project=p1, key='ATL-E3', defaults={
            'name': 'API Performance', 'summary': 'Optimize API endpoints', 'color': '#FF5630', 'status': 'todo'
        })

        s1, _ = Sprint.objects.get_or_create(project=p1, name='Sprint 12', defaults={
            'goal': 'Complete user authentication and dashboard redesign',
            'status': 'active',
            'start_date': '2026-02-09',
            'end_date': '2026-02-23',
        })
        s2, _ = Sprint.objects.get_or_create(project=p1, name='Sprint 13', defaults={
            'goal': 'API optimization and mobile responsiveness',
            'status': 'planned',
            'start_date': '2026-02-23',
            'end_date': '2026-03-09',
        })

        if not Issue.objects.filter(project=p1).exists():
            issues = [
                {
                    'key': 'ATL-101', 'title': 'Implement user authentication flow', 'issue_type': 'story', 'status': 'in_progress',
                    'priority': 'high', 'assignee': users['alex@company.com'], 'reporter': users['sarah@company.com'],
                    'sprint': s1, 'epic': e1, 'story_points': 8, 'estimated_hours': 16, 'logged_hours': 8,
                    'description': 'Build login, OAuth, password reset and session management',
                    'label_names': ['frontend', 'security'],
                },
                {
                    'key': 'ATL-102', 'title': 'Fix navigation menu dropdown not closing on outside click', 'issue_type': 'bug', 'status': 'todo',
                    'priority': 'medium', 'assignee': users['james@company.com'], 'reporter': users['alex@company.com'],
                    'sprint': s1, 'epic': e2, 'story_points': 2, 'estimated_hours': 4, 'logged_hours': 0,
                    'description': 'Dropdown menu stays open when clicking outside.',
                    'label_names': ['frontend'],
                },
                {
                    'key': 'ATL-103', 'title': 'Optimize API response times', 'issue_type': 'spike', 'status': 'todo',
                    'priority': 'highest', 'assignee': users['maria@company.com'], 'reporter': users['alex@company.com'],
                    'sprint': s1, 'epic': e3, 'story_points': 13, 'estimated_hours': 24, 'logged_hours': 0,
                    'description': 'Profile and optimize slow API endpoints under 200ms.',
                    'label_names': ['backend', 'performance'],
                },
                {
                    'key': 'ATL-104', 'title': 'Set up CI/CD pipeline', 'issue_type': 'task', 'status': 'todo',
                    'priority': 'high', 'assignee': users['david@company.com'], 'reporter': users['alex@company.com'],
                    'sprint': s2, 'epic': None, 'story_points': 8, 'estimated_hours': 16, 'logged_hours': 0,
                    'description': 'Configure automated testing and deployment pipeline.',
                    'label_names': ['backend'],
                },
            ]

            for payload in issues:
                issue = Issue.objects.create(
                    project=p1,
                    key=payload['key'],
                    title=payload['title'],
                    description=payload['description'],
                    issue_type=payload['issue_type'],
                    status=payload['status'],
                    priority=payload['priority'],
                    assignee=payload['assignee'],
                    reporter=payload['reporter'],
                    sprint=payload['sprint'],
                    epic=payload['epic'],
                    story_points=payload['story_points'],
                    estimated_hours=payload['estimated_hours'],
                    logged_hours=payload['logged_hours'],
                )
                issue.labels.set([labels[name] for name in payload['label_names']])
                issue.watchers.add(payload['reporter'])

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully.'))
