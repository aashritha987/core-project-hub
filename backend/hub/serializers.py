from django.contrib.auth import get_user_model
from rest_framework import serializers
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
    PlatformSetupInstruction,
    Project,
    ProjectOnboarding,
    Sprint,
)

User = get_user_model()


def _user_uid(user):
    return user.profile.uid if user and hasattr(user, 'profile') else None


class UserSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    email = serializers.EmailField()
    avatar = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    isActive = serializers.BooleanField(source='is_active')

    def get_id(self, obj):
        return _user_uid(obj)

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar(self, obj):
        return getattr(obj.profile, 'avatar', '')

    def get_initials(self, obj):
        return getattr(obj.profile, 'initials', 'U')

    def get_role(self, obj):
        return getattr(obj.profile, 'role', 'developer')


class LabelSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)

    class Meta:
        model = Label
        fields = ['id', 'name', 'color']


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    leadId = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'key', 'description', 'leadId', 'avatar']

    def get_leadId(self, obj):
        return _user_uid(obj.lead)


class ProjectWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    key = serializers.CharField(max_length=16)
    description = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(required=False, allow_blank=True)
    leadId = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class EpicSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    projectId = serializers.CharField(source='project.uid', read_only=True)

    class Meta:
        model = Epic
        fields = ['id', 'key', 'name', 'summary', 'color', 'status', 'projectId']


class SprintSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    projectId = serializers.CharField(source='project.uid', read_only=True)
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')

    class Meta:
        model = Sprint
        fields = ['id', 'name', 'goal', 'status', 'startDate', 'endDate', 'projectId']


class CommentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    authorId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    isEdited = serializers.BooleanField(source='is_edited', read_only=True)

    class Meta:
        model = IssueComment
        fields = ['id', 'authorId', 'content', 'createdAt', 'updatedAt', 'isEdited']

    def get_authorId(self, obj):
        return _user_uid(obj.author)


class LinkSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    type = serializers.CharField(source='link_type')
    targetIssueId = serializers.CharField(source='target_issue.uid', read_only=True)

    class Meta:
        model = IssueLink
        fields = ['id', 'type', 'targetIssueId']


class AttachmentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    name = serializers.CharField(source='original_name', read_only=True)
    uploadedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    fileUrl = serializers.SerializerMethodField()

    class Meta:
        model = IssueAttachment
        fields = ['id', 'name', 'size', 'fileUrl', 'uploadedBy', 'createdAt']

    def get_uploadedBy(self, obj):
        return _user_uid(obj.uploaded_by)

    def get_fileUrl(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class IssueSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    type = serializers.CharField(source='issue_type')
    assigneeId = serializers.SerializerMethodField()
    reporterId = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()
    sprintId = serializers.CharField(source='sprint.uid', read_only=True)
    epicId = serializers.CharField(source='epic.uid', read_only=True)
    parentId = serializers.CharField(source='parent.uid', read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    dueDate = serializers.DateField(source='due_date', allow_null=True, required=False)
    timeTracking = serializers.SerializerMethodField()
    links = LinkSerializer(many=True, read_only=True)
    watchers = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Issue
        fields = [
            'id', 'key', 'title', 'description', 'type', 'status', 'priority',
            'assigneeId', 'reporterId', 'labels', 'sprintId', 'epicId',
            'parentId', 'comments', 'createdAt', 'updatedAt', 'dueDate', 'timeTracking',
            'links', 'watchers',
            'attachments',
        ]

    def get_assigneeId(self, obj):
        return _user_uid(obj.assignee)

    def get_reporterId(self, obj):
        return _user_uid(obj.reporter)

    def get_labels(self, obj):
        return [l.uid for l in obj.labels.all()]

    def get_timeTracking(self, obj):
        return {
            'estimatedHours': obj.estimated_hours,
            'loggedHours': obj.logged_hours,
        }

    def get_watchers(self, obj):
        return [_user_uid(u) for u in obj.watchers.all()]


class IssueWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    type = serializers.ChoiceField(choices=[c[0] for c in Issue.TYPE_CHOICES])
    priority = serializers.ChoiceField(choices=[c[0] for c in Issue.PRIORITY_CHOICES], required=False)
    status = serializers.ChoiceField(choices=[c[0] for c in Issue.STATUS_CHOICES], required=False)
    assigneeId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reporterId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    labels = serializers.ListField(child=serializers.CharField(), required=False)
    sprintId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    epicId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parentId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dueDate = serializers.DateField(required=False, allow_null=True)
    timeTracking = serializers.DictField(required=False)


class SprintWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    goal = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[c[0] for c in Sprint.STATUS_CHOICES], required=False)
    startDate = serializers.DateField()
    endDate = serializers.DateField()


class EpicWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    summary = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=[c[0] for c in Epic.STATUS_CHOICES], required=False)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'project_manager', 'developer', 'viewer'])
    password = serializers.CharField(min_length=6, required=False, allow_blank=True)
    avatar = serializers.CharField(required=False, allow_blank=True)
    isActive = serializers.BooleanField(required=False)


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    type = serializers.CharField(source='notification_type', read_only=True)
    isRead = serializers.BooleanField(source='is_read', read_only=True)
    actionUrl = serializers.CharField(source='action_url', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'isRead', 'actionUrl', 'metadata', 'createdAt']


class ChatParticipantSerializer(serializers.ModelSerializer):
    userId = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)

    class Meta:
        model = ChatParticipant
        fields = ['userId', 'name', 'avatar', 'role']

    def get_userId(self, obj):
        return _user_uid(obj.user)

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_avatar(self, obj):
        return getattr(obj.user.profile, 'avatar', '')


class ChatMessageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    roomId = serializers.CharField(source='room.uid', read_only=True)
    senderId = serializers.SerializerMethodField()
    senderName = serializers.SerializerMethodField()
    senderAvatar = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    isEdited = serializers.BooleanField(source='is_edited', read_only=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'roomId',
            'senderId',
            'senderName',
            'senderAvatar',
            'content',
            'isEdited',
            'isDeleted',
            'createdAt',
            'updatedAt',
        ]

    def get_senderId(self, obj):
        return _user_uid(obj.sender)

    def get_senderName(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    def get_senderAvatar(self, obj):
        return getattr(obj.sender.profile, 'avatar', '')


class ChatRoomSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    type = serializers.CharField(source='room_type', read_only=True)
    projectId = serializers.CharField(source='project.uid', read_only=True, allow_null=True)
    isPrivate = serializers.BooleanField(source='is_private', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    participants = serializers.SerializerMethodField()
    unreadCount = serializers.SerializerMethodField()
    lastMessage = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id',
            'type',
            'name',
            'projectId',
            'isPrivate',
            'participants',
            'unreadCount',
            'lastMessage',
            'createdAt',
            'updatedAt',
        ]

    def get_participants(self, obj):
        participants = obj.chat_participants.select_related('user__profile').all()
        return ChatParticipantSerializer(participants, many=True).data

    def get_unreadCount(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        participant = obj.chat_participants.filter(user=request.user).first()
        if not participant:
            return 0
        qs = obj.messages.exclude(sender=request.user)
        if participant.last_read_message_id:
            qs = qs.filter(created_at__gt=participant.last_read_message.created_at)
        return qs.count()

    def get_lastMessage(self, obj):
        last = obj.messages.select_related('sender__profile').order_by('-created_at').first()
        if not last:
            return None
        return ChatMessageSerializer(last).data


class PlatformSetupInstructionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    onboardingId = serializers.CharField(source='onboarding.uid', read_only=True)
    displayOrder = serializers.IntegerField(source='display_order')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    createdById = serializers.SerializerMethodField()
    updatedById = serializers.SerializerMethodField()

    class Meta:
        model = PlatformSetupInstruction
        fields = [
            'id',
            'onboardingId',
            'platform',
            'title',
            'content',
            'displayOrder',
            'createdAt',
            'updatedAt',
            'createdById',
            'updatedById',
        ]

    def get_createdById(self, obj):
        return _user_uid(obj.created_by)

    def get_updatedById(self, obj):
        return _user_uid(obj.updated_by)


class PlatformSetupInstructionWriteSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=[c[0] for c in PlatformSetupInstruction.PLATFORM_CHOICES])
    title = serializers.CharField(max_length=255)
    content = serializers.CharField()
    displayOrder = serializers.IntegerField(required=False, min_value=0)


class ProjectOnboardingSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='uid', read_only=True)
    projectId = serializers.CharField(source='project.uid', read_only=True)
    repositoryUrl = serializers.CharField(source='repository_url', read_only=True)
    instructions = PlatformSetupInstructionSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    createdById = serializers.SerializerMethodField()
    updatedById = serializers.SerializerMethodField()

    class Meta:
        model = ProjectOnboarding
        fields = [
            'id',
            'projectId',
            'overview',
            'repositoryUrl',
            'prerequisites',
            'instructions',
            'createdAt',
            'updatedAt',
            'createdById',
            'updatedById',
        ]

    def get_createdById(self, obj):
        return _user_uid(obj.created_by)

    def get_updatedById(self, obj):
        return _user_uid(obj.updated_by)


class ProjectOnboardingWriteSerializer(serializers.Serializer):
    overview = serializers.CharField(required=False, allow_blank=True)
    repositoryUrl = serializers.CharField(required=False, allow_blank=True)
    prerequisites = serializers.CharField(required=False, allow_blank=True)
