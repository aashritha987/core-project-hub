from django.contrib import admin
from .models import (
    ChatMessage,
    ChatParticipant,
    ChatRoom,
    Epic,
    Issue,
    IssueAttachment,
    IssueComment,
    IssueLink,
    Label,
    Notification,
    Project,
    Sprint,
    UserProfile,
)

admin.site.register(UserProfile)
admin.site.register(Project)
admin.site.register(Label)
admin.site.register(Epic)
admin.site.register(Sprint)
admin.site.register(Issue)
admin.site.register(IssueComment)
admin.site.register(IssueLink)
admin.site.register(Notification)
admin.site.register(IssueAttachment)
admin.site.register(ChatRoom)
admin.site.register(ChatParticipant)
admin.site.register(ChatMessage)
