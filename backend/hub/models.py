import uuid
from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def make_uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def user_uid():
    return make_uid('u')


def project_uid():
    return make_uid('p')


def label_uid():
    return make_uid('l')


def epic_uid():
    return make_uid('e')


def sprint_uid():
    return make_uid('s')


def issue_uid():
    return make_uid('i')


def comment_uid():
    return make_uid('c')


def link_uid():
    return make_uid('lk')


def notification_uid():
    return make_uid('n')


class UserProfile(models.Model):
    ROLE_ADMIN = 'admin'
    ROLE_PM = 'project_manager'
    ROLE_DEV = 'developer'
    ROLE_VIEWER = 'viewer'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_PM, 'Project Manager'),
        (ROLE_DEV, 'Developer'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=user_uid)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_DEV)
    avatar = models.CharField(max_length=64, blank=True, default='')

    @property
    def initials(self) -> str:
        parts = [p for p in self.user.get_full_name().split(' ') if p]
        if not parts:
            return (self.user.username or 'U')[:2].upper()
        return ''.join(p[0] for p in parts)[:2].upper()

    def __str__(self):
        return f"{self.user.email} ({self.role})"


class Project(TimeStampedModel):
    uid = models.CharField(max_length=32, unique=True, default=project_uid)
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=16, unique=True)
    description = models.TextField(blank=True, default='')
    lead = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='led_projects')
    avatar = models.CharField(max_length=64, blank=True, default='')

    def __str__(self):
        return f"{self.key} - {self.name}"


class Label(models.Model):
    uid = models.CharField(max_length=32, unique=True, default=label_uid)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='labels')
    name = models.CharField(max_length=64)
    color = models.CharField(max_length=32, default='gray')

    class Meta:
        unique_together = ('project', 'name')


class Epic(TimeStampedModel):
    STATUS_TODO = 'todo'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_DONE = 'done'
    STATUS_CHOICES = [
        (STATUS_TODO, 'To Do'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_DONE, 'Done'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=epic_uid)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='epics')
    key = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    summary = models.TextField(blank=True, default='')
    color = models.CharField(max_length=16, default='#6554C0')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_TODO)


class Sprint(TimeStampedModel):
    STATUS_ACTIVE = 'active'
    STATUS_PLANNED = 'planned'
    STATUS_COMPLETED = 'completed'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PLANNED, 'Planned'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=sprint_uid)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=255)
    goal = models.TextField(blank=True, default='')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    start_date = models.DateField()
    end_date = models.DateField()


class Issue(TimeStampedModel):
    TYPE_CHOICES = [
        ('story', 'Story'),
        ('bug', 'Bug'),
        ('task', 'Task'),
        ('epic', 'Epic'),
        ('subtask', 'Sub-task'),
        ('spike', 'Spike'),
    ]
    PRIORITY_CHOICES = [
        ('highest', 'Highest'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        ('lowest', 'Lowest'),
    ]
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('done', 'Done'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=issue_uid)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='issues')
    key = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    issue_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='medium')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_issues')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reported_issues')
    labels = models.ManyToManyField(Label, blank=True, related_name='issues')
    story_points = models.IntegerField(null=True, blank=True)
    sprint = models.ForeignKey(Sprint, null=True, blank=True, on_delete=models.SET_NULL, related_name='issues')
    epic = models.ForeignKey(Epic, null=True, blank=True, on_delete=models.SET_NULL, related_name='issues')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subtasks')
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.FloatField(null=True, blank=True)
    logged_hours = models.FloatField(default=0)
    watchers = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='watched_issues')


class IssueComment(models.Model):
    uid = models.CharField(max_length=32, unique=True, default=comment_uid)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class IssueLink(models.Model):
    TYPE_CHOICES = [
        ('blocks', 'blocks'),
        ('is_blocked_by', 'is blocked by'),
        ('relates_to', 'relates to'),
        ('duplicates', 'duplicates'),
        ('is_duplicated_by', 'is duplicated by'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=link_uid)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    target_issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='reverse_links')

    class Meta:
        unique_together = ('issue', 'link_type', 'target_issue')


class Notification(models.Model):
    TYPE_INFO = 'info'
    TYPE_ASSIGNMENT = 'assignment'
    TYPE_COMMENT = 'comment'
    TYPE_STATUS = 'status_change'
    TYPE_SPRINT = 'sprint'
    TYPE_SYSTEM = 'system'
    TYPE_CHOICES = [
        (TYPE_INFO, 'Info'),
        (TYPE_ASSIGNMENT, 'Assignment'),
        (TYPE_COMMENT, 'Comment'),
        (TYPE_STATUS, 'Status Change'),
        (TYPE_SPRINT, 'Sprint'),
        (TYPE_SYSTEM, 'System'),
    ]

    uid = models.CharField(max_length=32, unique=True, default=notification_uid)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default=TYPE_INFO)
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
