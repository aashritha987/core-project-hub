from django.contrib import admin
from .models import UserProfile, Project, Label, Epic, Sprint, Issue, IssueComment, IssueLink, Notification

admin.site.register(UserProfile)
admin.site.register(Project)
admin.site.register(Label)
admin.site.register(Epic)
admin.site.register(Sprint)
admin.site.register(Issue)
admin.site.register(IssueComment)
admin.site.register(IssueLink)
admin.site.register(Notification)
