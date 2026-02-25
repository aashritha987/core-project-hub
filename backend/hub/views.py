from collections import defaultdict
from datetime import timedelta
import re

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

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
from .permissions import can_edit_issue, can_manage_project, can_manage_project_onboarding, can_manage_sprints
from .serializers import (
    ChatMessageSerializer,
    ChatRoomSerializer,
    EpicSerializer,
    EpicWriteSerializer,
    ForgotPasswordSerializer,
    IssueSerializer,
    IssueWriteSerializer,
    LabelSerializer,
    LoginSerializer,
    PlatformSetupInstructionSerializer,
    PlatformSetupInstructionWriteSerializer,
    ProjectSerializer,
    ProjectOnboardingSerializer,
    ProjectOnboardingWriteSerializer,
    ProjectWriteSerializer,
    SprintSerializer,
    SprintWriteSerializer,
    NotificationSerializer,
    UserSerializer,
    UserWriteSerializer,
)

User = get_user_model()
MENTION_PATTERN = re.compile(r'(?<!\w)@([A-Za-z0-9._-]{2,64})')


def _user_by_uid(uid: str):
    if not uid:
        return None
    return User.objects.filter(profile__uid=uid).first()


def _project_by_uid(uid: str):
    return Project.objects.filter(uid=uid).first()


def _epic_by_uid(uid: str):
    return Epic.objects.filter(uid=uid).first()


def _sprint_by_uid(uid: str):
    return Sprint.objects.filter(uid=uid).first()


def _issue_by_uid(uid: str):
    return Issue.objects.filter(uid=uid).first()


def _chat_room_by_uid(uid: str):
    return ChatRoom.objects.filter(uid=uid).first()


def _chat_message_by_uid(uid: str):
    return ChatMessage.objects.filter(uid=uid).first()


def _dm_key(user_a_id: int, user_b_id: int):
    low, high = sorted([user_a_id, user_b_id])
    return f'global:{low}:{high}'


def _create_notifications(users, *, title: str, message: str, notification_type: str, actor=None, action_url: str = '', metadata=None):
    metadata = metadata or {}
    recipients = []
    seen_ids = set()
    for user in users:
        if not user:
            continue
        if actor and user.id == actor.id:
            continue
        if user.id in seen_ids:
            continue
        seen_ids.add(user.id)
        recipients.append(user)

    Notification.objects.bulk_create([
        Notification(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            metadata=metadata,
        )
        for user in recipients
    ])

    channel_layer = get_channel_layer()
    if channel_layer:
        for user in recipients:
            async_to_sync(channel_layer.group_send)(
                f'user_notifications_{user.id}',
                {'type': 'notification_event', 'event': 'created'},
            )


def _emit_chat_event(room: ChatRoom, event_type: str, payload: dict):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    async_to_sync(channel_layer.group_send)(
        f'chat_room_{room.uid}',
        {
            'type': 'chat_event',
            'event_type': event_type,
            'payload': payload,
        },
    )


def _is_chat_member(room: ChatRoom, user):
    return room.chat_participants.filter(user=user).exists()


def _extract_mentions(content: str) -> list[str]:
    return list({token.lower() for token in MENTION_PATTERN.findall(content or '')})


def _resolve_mentioned_users(issue: Issue, content: str):
    mention_tokens = _extract_mentions(content)
    if not mention_tokens:
        return []

    participants = list(_project_participants(issue.project))
    mentioned_users = []
    seen_ids = set()

    for user in participants:
        full_name = (user.get_full_name() or '').strip().lower()
        username = (user.username or '').strip().lower()
        email_local = (user.email.split('@', 1)[0] if user.email else '').strip().lower()
        first_name = (user.first_name or '').strip().lower()
        last_name = (user.last_name or '').strip().lower()
        full_name_compact = full_name.replace(' ', '')

        if any(
            token in {
                username,
                email_local,
                first_name,
                last_name,
                full_name,
                full_name_compact,
            }
            for token in mention_tokens
        ):
            if user.id not in seen_ids:
                seen_ids.add(user.id)
                mentioned_users.append(user)

    return mentioned_users


def _project_participants(project: Project):
    user_ids = set([project.lead_id])
    user_ids.update(Issue.objects.filter(project=project).exclude(assignee=None).values_list('assignee_id', flat=True))
    user_ids.update(Issue.objects.filter(project=project).values_list('reporter_id', flat=True))
    return User.objects.filter(id__in=user_ids)


def _issue_response(issue: Issue, request):
    return IssueSerializer(issue, context={'request': request}).data


def _apply_issue_payload(issue: Issue, payload: dict, request_user):
    if 'title' in payload:
        issue.title = payload['title']
    if 'description' in payload:
        issue.description = payload.get('description', '')
    if 'type' in payload:
        issue.issue_type = payload['type']
    if 'priority' in payload:
        issue.priority = payload['priority']
    if 'status' in payload:
        issue.status = payload['status']
    if 'assigneeId' in payload:
        issue.assignee = _user_by_uid(payload.get('assigneeId'))
    if 'reporterId' in payload:
        issue.reporter = _user_by_uid(payload.get('reporterId')) or request_user
    if 'sprintId' in payload:
        issue.sprint = _sprint_by_uid(payload.get('sprintId'))
    if 'epicId' in payload:
        issue.epic = _epic_by_uid(payload.get('epicId'))
    if 'parentId' in payload:
        issue.parent = _issue_by_uid(payload.get('parentId'))
    if 'dueDate' in payload:
        issue.due_date = payload.get('dueDate')
    if 'timeTracking' in payload:
        tracking = payload.get('timeTracking') or {}
        if 'estimatedHours' in tracking:
            issue.estimated_hours = tracking.get('estimatedHours')
        if 'loggedHours' in tracking:
            issue.logged_hours = tracking.get('loggedHours') or 0

    issue.save()
    if 'labels' in payload:
        labels = Label.objects.filter(uid__in=payload['labels'])
        issue.labels.set(labels)


class AuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, username=serializer.validated_data['email'], password=serializer.validated_data['password'])
        if not user:
            return Response({'success': False, 'error': 'Invalid email or password'}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'success': True, 'token': token.key, 'user': UserSerializer(user).data})


class AuthForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        exists = User.objects.filter(email=email).exists()
        if exists:
            return Response({'success': True, 'message': 'Password reset link sent to your email (demo)'})
        return Response({'success': False, 'message': 'No account found with that email'})


class AuthMeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class AuthLogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'success': True})


class UsersListView(APIView):
    def get(self, request):
        users = User.objects.select_related('profile').order_by('first_name', 'last_name')
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        name = serializer.validated_data['name'].strip()
        first, *rest = name.split(' ')
        password = serializer.validated_data.get('password') or 'changeme123'
        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=first,
            last_name=' '.join(rest),
            password=password,
            is_active=serializer.validated_data.get('isActive', True),
        )
        user.profile.role = serializer.validated_data['role']
        user.profile.avatar = serializer.validated_data.get('avatar', '')
        user.profile.save(update_fields=['role', 'avatar'])
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    def patch(self, request, user_uid):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user = _user_by_uid(user_uid)
        if not user:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        existing_name = user.get_full_name() or user.username
        payload = {
            'name': request.data.get('name', existing_name),
            'email': request.data.get('email', user.email),
            'role': request.data.get('role', user.profile.role),
            'password': request.data.get('password', ''),
            'avatar': request.data.get('avatar', user.profile.avatar),
            'isActive': request.data.get('isActive', user.is_active),
        }
        serializer = UserWriteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return Response({'detail': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        name = serializer.validated_data['name'].strip()
        first, *rest = name.split(' ')
        user.email = email
        user.username = email
        user.first_name = first
        user.last_name = ' '.join(rest)
        user.is_active = serializer.validated_data.get('isActive', user.is_active)
        password = serializer.validated_data.get('password')
        if password:
            user.set_password(password)
        user.save()

        user.profile.role = serializer.validated_data['role']
        user.profile.avatar = serializer.validated_data.get('avatar', user.profile.avatar)
        user.profile.save(update_fields=['role', 'avatar'])
        return Response(UserSerializer(user).data)

    def delete(self, request, user_uid):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user = _user_by_uid(user_uid)
        if not user:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if user.id == request.user.id:
            return Response({'detail': 'You cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
        if Project.objects.filter(lead=user).exists() or Issue.objects.filter(reporter=user).exists():
            return Response(
                {'detail': 'Cannot delete this user because they are a project lead or issue reporter'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectListView(APIView):
    def get(self, request):
        projects = Project.objects.select_related('lead__profile').all().order_by('name')
        return Response(ProjectSerializer(projects, many=True).data)

    def post(self, request):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data['key'].upper().strip()
        if Project.objects.filter(key=key).exists():
            return Response({'detail': 'Project key already exists'}, status=status.HTTP_400_BAD_REQUEST)
        lead = _user_by_uid(serializer.validated_data.get('leadId')) or request.user
        project = Project.objects.create(
            name=serializer.validated_data['name'].strip(),
            key=key,
            description=serializer.validated_data.get('description', ''),
            avatar=serializer.validated_data.get('avatar', ''),
            lead=lead,
        )
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    def patch(self, request, project_uid):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        project = _project_by_uid(project_uid)
        if not project:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        for field in ['name', 'description', 'avatar']:
            if field in request.data:
                setattr(project, field, request.data[field])
        project.save()
        return Response(ProjectSerializer(project).data)

    def delete(self, request, project_uid):
        if not can_manage_project(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        project = _project_by_uid(project_uid)
        if not project:
            return Response(status=status.HTTP_204_NO_CONTENT)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectOnboardingView(APIView):
    def get(self, request, project_uid):
        project = _project_by_uid(project_uid)
        if not project:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        onboarding = ProjectOnboarding.objects.filter(project=project).prefetch_related('instructions').first()
        can_edit = can_manage_project_onboarding(request.user, project)
        if not onboarding:
            return Response({'exists': False, 'canEdit': can_edit, 'onboarding': None})
        return Response(
            {
                'exists': True,
                'canEdit': can_edit,
                'onboarding': ProjectOnboardingSerializer(onboarding, context={'request': request}).data,
            }
        )

    def put(self, request, project_uid):
        project = _project_by_uid(project_uid)
        if not project:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_project_onboarding(request.user, project):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProjectOnboardingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        onboarding, _ = ProjectOnboarding.objects.get_or_create(
            project=project,
            defaults={'created_by': request.user, 'updated_by': request.user},
        )
        if 'overview' in serializer.validated_data:
            onboarding.overview = serializer.validated_data.get('overview', '')
        if 'repositoryUrl' in serializer.validated_data:
            onboarding.repository_url = serializer.validated_data.get('repositoryUrl', '')
        if 'prerequisites' in serializer.validated_data:
            onboarding.prerequisites = serializer.validated_data.get('prerequisites', '')
        if onboarding.created_by_id is None:
            onboarding.created_by = request.user
        onboarding.updated_by = request.user
        onboarding.save()
        return Response(
            {
                'exists': True,
                'canEdit': True,
                'onboarding': ProjectOnboardingSerializer(onboarding, context={'request': request}).data,
            }
        )

    patch = put


class PlatformSetupInstructionListCreateView(APIView):
    def post(self, request, project_uid):
        project = _project_by_uid(project_uid)
        if not project:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_project_onboarding(request.user, project):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        onboarding, _ = ProjectOnboarding.objects.get_or_create(
            project=project,
            defaults={'created_by': request.user, 'updated_by': request.user},
        )

        serializer = PlatformSetupInstructionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instruction = PlatformSetupInstruction.objects.create(
            onboarding=onboarding,
            platform=serializer.validated_data['platform'],
            title=serializer.validated_data['title'],
            content=serializer.validated_data['content'],
            display_order=serializer.validated_data.get('displayOrder', 0),
            created_by=request.user,
            updated_by=request.user,
        )
        onboarding.updated_by = request.user
        onboarding.save(update_fields=['updated_by', 'updated_at'])
        return Response(
            PlatformSetupInstructionSerializer(instruction, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformSetupInstructionDetailView(APIView):
    def patch(self, request, instruction_uid):
        instruction = PlatformSetupInstruction.objects.select_related('onboarding__project').filter(uid=instruction_uid).first()
        if not instruction:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_project_onboarding(request.user, instruction.onboarding.project):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PlatformSetupInstructionWriteSerializer(
            data={
                'platform': request.data.get('platform', instruction.platform),
                'title': request.data.get('title', instruction.title),
                'content': request.data.get('content', instruction.content),
                'displayOrder': request.data.get('displayOrder', instruction.display_order),
            }
        )
        serializer.is_valid(raise_exception=True)
        instruction.platform = serializer.validated_data['platform']
        instruction.title = serializer.validated_data['title']
        instruction.content = serializer.validated_data['content']
        instruction.display_order = serializer.validated_data.get('displayOrder', instruction.display_order)
        instruction.updated_by = request.user
        instruction.save()

        instruction.onboarding.updated_by = request.user
        instruction.onboarding.save(update_fields=['updated_by', 'updated_at'])
        return Response(PlatformSetupInstructionSerializer(instruction, context={'request': request}).data)

    def delete(self, request, instruction_uid):
        instruction = PlatformSetupInstruction.objects.select_related('onboarding__project').filter(uid=instruction_uid).first()
        if not instruction:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not can_manage_project_onboarding(request.user, instruction.onboarding.project):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        onboarding = instruction.onboarding
        instruction.delete()
        onboarding.updated_by = request.user
        onboarding.save(update_fields=['updated_by', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class LabelsView(APIView):
    def get(self, request):
        project_uid = request.query_params.get('project_id')
        labels = Label.objects.all()
        if project_uid:
            labels = labels.filter(project__uid=project_uid)
        return Response(LabelSerializer(labels, many=True).data)


class EpicsView(APIView):
    def get(self, request):
        project_uid = request.query_params.get('project_id')
        epics = Epic.objects.all().order_by('-created_at')
        if project_uid:
            epics = epics.filter(project__uid=project_uid)
        return Response(EpicSerializer(epics, many=True).data)

    def post(self, request):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        project = _project_by_uid(request.data.get('projectId'))
        if not project:
            return Response({'detail': 'projectId is required'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EpicWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        count = Epic.objects.filter(project=project).count() + 1
        epic = Epic.objects.create(
            project=project,
            key=f"{project.key}-E{count}",
            name=serializer.validated_data['name'],
            summary=serializer.validated_data.get('summary', ''),
            color=serializer.validated_data.get('color', '#6554C0'),
            status=serializer.validated_data.get('status', 'todo'),
        )
        return Response(EpicSerializer(epic).data, status=status.HTTP_201_CREATED)


class EpicDetailView(APIView):
    def patch(self, request, epic_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        epic = _epic_by_uid(epic_uid)
        if not epic:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EpicWriteSerializer(data={**EpicSerializer(epic).data, **request.data})
        serializer.is_valid(raise_exception=True)
        for field, src in [('name', 'name'), ('summary', 'summary'), ('color', 'color'), ('status', 'status')]:
            if src in serializer.validated_data:
                setattr(epic, field, serializer.validated_data[src])
        epic.save()
        return Response(EpicSerializer(epic).data)

    def delete(self, request, epic_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        epic = _epic_by_uid(epic_uid)
        if not epic:
            return Response(status=status.HTTP_204_NO_CONTENT)
        Issue.objects.filter(epic=epic).update(epic=None)
        epic.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintsView(APIView):
    def get(self, request):
        project_uid = request.query_params.get('project_id')
        sprints = Sprint.objects.all().order_by('start_date')
        if project_uid:
            sprints = sprints.filter(project__uid=project_uid)
        return Response(SprintSerializer(sprints, many=True).data)

    def post(self, request):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        project = _project_by_uid(request.data.get('projectId'))
        if not project:
            return Response({'detail': 'projectId is required'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SprintWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sprint = Sprint.objects.create(
            project=project,
            name=serializer.validated_data['name'],
            goal=serializer.validated_data.get('goal', ''),
            status=serializer.validated_data.get('status', 'planned'),
            start_date=serializer.validated_data['startDate'],
            end_date=serializer.validated_data['endDate'],
        )
        return Response(SprintSerializer(sprint).data, status=status.HTTP_201_CREATED)


class SprintDetailView(APIView):
    def patch(self, request, sprint_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        sprint = _sprint_by_uid(sprint_uid)
        if not sprint:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        data = {
            'name': request.data.get('name', sprint.name),
            'goal': request.data.get('goal', sprint.goal),
            'status': request.data.get('status', sprint.status),
            'startDate': request.data.get('startDate', sprint.start_date),
            'endDate': request.data.get('endDate', sprint.end_date),
        }
        serializer = SprintWriteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        sprint.name = serializer.validated_data['name']
        sprint.goal = serializer.validated_data.get('goal', '')
        sprint.status = serializer.validated_data.get('status', sprint.status)
        sprint.start_date = serializer.validated_data['startDate']
        sprint.end_date = serializer.validated_data['endDate']
        sprint.save()
        return Response(SprintSerializer(sprint).data)

    def delete(self, request, sprint_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        sprint = _sprint_by_uid(sprint_uid)
        if not sprint:
            return Response(status=status.HTTP_204_NO_CONTENT)
        Issue.objects.filter(sprint=sprint).update(sprint=None)
        sprint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintStartView(APIView):
    def post(self, request, sprint_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        sprint = _sprint_by_uid(sprint_uid)
        if not sprint:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        Sprint.objects.filter(project=sprint.project, status='active').exclude(id=sprint.id).update(status='completed')
        sprint.status = 'active'
        sprint.save(update_fields=['status'])
        _create_notifications(
            _project_participants(sprint.project),
            title=f"{sprint.name} started",
            message=f"Sprint '{sprint.name}' is now active.",
            notification_type=Notification.TYPE_SPRINT,
            actor=request.user,
            action_url='/sprints',
            metadata={'sprintId': sprint.uid, 'event': 'started'},
        )
        return Response(SprintSerializer(sprint).data)


class SprintCompleteView(APIView):
    def post(self, request, sprint_uid):
        if not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        sprint = _sprint_by_uid(sprint_uid)
        if not sprint:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        sprint.status = 'completed'
        sprint.save(update_fields=['status'])
        Issue.objects.filter(sprint=sprint).exclude(status='done').update(sprint=None)
        _create_notifications(
            _project_participants(sprint.project),
            title=f"{sprint.name} completed",
            message=f"Sprint '{sprint.name}' has been completed. Incomplete issues were moved to backlog.",
            notification_type=Notification.TYPE_SPRINT,
            actor=request.user,
            action_url='/sprints',
            metadata={'sprintId': sprint.uid, 'event': 'completed'},
        )
        return Response(SprintSerializer(sprint).data)


class IssuesView(APIView):
    def get(self, request):
        qs = Issue.objects.select_related('assignee__profile', 'reporter__profile', 'sprint', 'epic', 'parent').prefetch_related('labels', 'comments__author__profile', 'links__target_issue', 'watchers__profile')

        project_uid = request.query_params.get('project_id')
        if project_uid:
            qs = qs.filter(project__uid=project_uid)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(key__icontains=search))

        for param, lookup in [
            ('sprint_id', 'sprint__uid'),
            ('epic_id', 'epic__uid'),
            ('assignee_id', 'assignee__profile__uid'),
            ('type', 'issue_type'),
            ('status', 'status'),
        ]:
            value = request.query_params.get(param)
            if value:
                qs = qs.filter(**{lookup: value})

        include_subtasks = request.query_params.get('include_subtasks', 'true').lower() == 'true'
        if not include_subtasks:
            qs = qs.filter(parent__isnull=True)

        issues = qs.order_by('-updated_at')
        return Response(IssueSerializer(issues, many=True, context={'request': request}).data)

    @transaction.atomic
    def post(self, request):
        serializer = IssueWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = _project_by_uid(request.data.get('projectId'))
        if not project:
            return Response({'detail': 'projectId is required'}, status=status.HTTP_400_BAD_REQUEST)

        next_num = Issue.objects.filter(project=project).count() + 101
        issue = Issue.objects.create(
            project=project,
            key=f"{project.key}-{next_num}",
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            issue_type=serializer.validated_data['type'],
            status=serializer.validated_data.get('status', 'todo'),
            priority=serializer.validated_data.get('priority', 'medium'),
            reporter=_user_by_uid(serializer.validated_data.get('reporterId')) or request.user,
        )
        _apply_issue_payload(issue, serializer.validated_data, request.user)
        if request.user.is_authenticated:
            issue.watchers.add(request.user)
        _create_notifications(
            [issue.assignee, issue.reporter],
            title=f"New issue: {issue.key}",
            message=f"{request.user.get_full_name() or request.user.username} created '{issue.title}'.",
            notification_type=Notification.TYPE_INFO,
            actor=request.user,
            action_url='/backlog',
            metadata={'issueId': issue.uid, 'issueKey': issue.key},
        )
        return Response(_issue_response(issue, request), status=status.HTTP_201_CREATED)


class IssueDetailView(APIView):
    def patch(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        prev_assignee = issue.assignee
        prev_status = issue.status
        _apply_issue_payload(issue, request.data, request.user)
        if issue.assignee and (not prev_assignee or prev_assignee.id != issue.assignee.id):
            _create_notifications(
                [issue.assignee],
                title=f"Assigned: {issue.key}",
                message=f"You were assigned to '{issue.title}'.",
                notification_type=Notification.TYPE_ASSIGNMENT,
                actor=request.user,
                action_url='/board',
                metadata={'issueId': issue.uid, 'issueKey': issue.key},
            )
        if issue.status != prev_status:
            _create_notifications(
                [issue.assignee, issue.reporter],
                title=f"Status updated: {issue.key}",
                message=f"Status changed from '{prev_status}' to '{issue.status}'.",
                notification_type=Notification.TYPE_STATUS,
                actor=request.user,
                action_url='/board',
                metadata={'issueId': issue.uid, 'issueKey': issue.key},
            )
        return Response(_issue_response(issue, request))

    def delete(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        issue.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueMoveView(APIView):
    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        if new_status not in [c[0] for c in Issue.STATUS_CHOICES]:
            return Response({'detail': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        issue.status = new_status
        issue.save(update_fields=['status', 'updated_at'])
        return Response(_issue_response(issue, request))


class IssueCommentCreateView(APIView):
    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        IssueComment.objects.create(issue=issue, author=request.user, content=content)
        recipients = set(issue.watchers.all())
        recipients.add(issue.reporter)
        if issue.assignee:
            recipients.add(issue.assignee)
        _create_notifications(
            recipients,
            title=f"New comment on {issue.key}",
            message=f"{request.user.get_full_name() or request.user.username} commented on '{issue.title}'.",
            notification_type=Notification.TYPE_COMMENT,
            actor=request.user,
            action_url='/board',
            metadata={'issueId': issue.uid, 'issueKey': issue.key},
        )
        mentioned_users = _resolve_mentioned_users(issue, content)
        standard_recipient_ids = {user.id for user in recipients if user}
        mentioned_users = [user for user in mentioned_users if user.id not in standard_recipient_ids]
        if mentioned_users:
            _create_notifications(
                mentioned_users,
                title=f"You were mentioned in {issue.key}",
                message=f"{request.user.get_full_name() or request.user.username} mentioned you in a comment on '{issue.title}'.",
                notification_type=Notification.TYPE_COMMENT,
                actor=request.user,
                action_url='/board',
                metadata={'issueId': issue.uid, 'issueKey': issue.key, 'event': 'mention'},
            )
        return Response(_issue_response(issue, request))


class IssueCommentDetailView(APIView):
    def patch(self, request, issue_uid, comment_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        comment = IssueComment.objects.filter(issue=issue, uid=comment_uid).first()
        if not comment:
            return Response({'detail': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        is_manager = can_manage_sprints(request.user)
        is_author = comment.author_id == request.user.id
        if not (is_manager or is_author):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        comment.content = content
        comment.is_edited = True
        comment.save(update_fields=['content', 'is_edited', 'updated_at'])
        mentioned_users = _resolve_mentioned_users(issue, content)
        if mentioned_users:
            _create_notifications(
                mentioned_users,
                title=f"You were mentioned in {issue.key}",
                message=f"{request.user.get_full_name() or request.user.username} mentioned you in an updated comment on '{issue.title}'.",
                notification_type=Notification.TYPE_COMMENT,
                actor=request.user,
                action_url='/board',
                metadata={'issueId': issue.uid, 'issueKey': issue.key, 'event': 'mention'},
            )
        return Response(_issue_response(issue, request))

    def delete(self, request, issue_uid, comment_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response(status=status.HTTP_204_NO_CONTENT)
        comment = IssueComment.objects.filter(issue=issue, uid=comment_uid).first()
        if not comment:
            return Response(status=status.HTTP_204_NO_CONTENT)

        is_manager = can_manage_sprints(request.user)
        is_author = comment.author_id == request.user.id
        if not (is_manager or is_author):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(_issue_response(issue, request))


class IssueLogTimeView(APIView):
    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        try:
            hours = float(request.data.get('hours'))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid hours'}, status=status.HTTP_400_BAD_REQUEST)
        if hours <= 0:
            return Response({'detail': 'hours must be > 0'}, status=status.HTTP_400_BAD_REQUEST)
        issue.logged_hours += hours
        issue.save(update_fields=['logged_hours', 'updated_at'])
        return Response(_issue_response(issue, request))


class IssueWatchToggleView(APIView):
    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if issue.watchers.filter(id=request.user.id).exists():
            issue.watchers.remove(request.user)
        else:
            issue.watchers.add(request.user)
        return Response(_issue_response(issue, request))


class IssueLinkCreateView(APIView):
    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        target_key = (request.data.get('targetKey') or '').upper()
        link_type = request.data.get('type')
        target_issue = Issue.objects.filter(key=target_key).first()
        if not target_issue:
            return Response({'detail': 'Target issue not found'}, status=status.HTTP_400_BAD_REQUEST)
        if link_type not in [c[0] for c in IssueLink.TYPE_CHOICES]:
            return Response({'detail': 'Invalid link type'}, status=status.HTTP_400_BAD_REQUEST)
        IssueLink.objects.get_or_create(issue=issue, target_issue=target_issue, link_type=link_type)
        return Response(_issue_response(issue, request))


class IssueLinkDeleteView(APIView):
    def delete(self, request, issue_uid, link_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        IssueLink.objects.filter(issue=issue, uid=link_uid).delete()
        return Response(_issue_response(issue, request))


class IssueAttachmentUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, issue_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        incoming = request.FILES.get('file')
        if not incoming:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        IssueAttachment.objects.create(
            issue=issue,
            uploaded_by=request.user,
            file=incoming,
            original_name=incoming.name,
            size=incoming.size,
        )
        return Response(_issue_response(issue, request), status=status.HTTP_201_CREATED)


class IssueAttachmentDeleteView(APIView):
    def delete(self, request, issue_uid, attachment_uid):
        issue = _issue_by_uid(issue_uid)
        if not issue:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not can_edit_issue(request.user, issue):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        attachment = IssueAttachment.objects.filter(issue=issue, uid=attachment_uid).first()
        if attachment:
            attachment.file.delete(save=False)
            attachment.delete()
        return Response(_issue_response(issue, request))


class ChatRoomListView(APIView):
    def get(self, request):
        room_type = request.query_params.get('type')
        project_uid = request.query_params.get('project_id')
        qs = ChatRoom.objects.filter(chat_participants__user=request.user).distinct()
        if room_type in [ChatRoom.TYPE_DM, ChatRoom.TYPE_CHANNEL]:
            qs = qs.filter(room_type=room_type)
        if project_uid:
            qs = qs.filter(project__uid=project_uid)
        qs = qs.select_related('project').prefetch_related(
            'chat_participants__user__profile',
            'messages__sender__profile',
        )
        return Response(ChatRoomSerializer(qs, many=True, context={'request': request}).data)


class ChatDirectMessageCreateView(APIView):
    def post(self, request):
        target_user = _user_by_uid(request.data.get('targetUserId'))
        if not target_user:
            return Response({'detail': 'targetUserId is required'}, status=status.HTTP_400_BAD_REQUEST)
        if target_user.id == request.user.id:
            return Response({'detail': 'Cannot create DM with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        dm_key = _dm_key(request.user.id, target_user.id)
        room = ChatRoom.objects.filter(dm_key=dm_key, room_type=ChatRoom.TYPE_DM).first()
        created = False
        if not room:
            created = True
            room = ChatRoom.objects.create(
                room_type=ChatRoom.TYPE_DM,
                created_by=request.user,
                dm_key=dm_key,
            )
            ChatParticipant.objects.bulk_create([
                ChatParticipant(room=room, user=request.user, role=ChatParticipant.ROLE_OWNER),
                ChatParticipant(room=room, user=target_user, role=ChatParticipant.ROLE_MEMBER),
            ])

        room_data = ChatRoomSerializer(room, context={'request': request}).data
        return Response(room_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChatChannelCreateView(APIView):
    def post(self, request):
        project = _project_by_uid(request.data.get('projectId'))
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)

        dup_qs = ChatRoom.objects.filter(room_type=ChatRoom.TYPE_CHANNEL, name__iexact=name)
        if project:
            dup_qs = dup_qs.filter(project=project)
        else:
            dup_qs = dup_qs.filter(project__isnull=True)
        if dup_qs.exists():
            return Response({'detail': 'Channel name already exists'}, status=status.HTTP_400_BAD_REQUEST)

        member_ids = request.data.get('memberIds') or []
        members = User.objects.filter(profile__uid__in=member_ids)

        room = ChatRoom.objects.create(
            room_type=ChatRoom.TYPE_CHANNEL,
            project=project,
            name=name,
            is_private=bool(request.data.get('isPrivate', False)),
            created_by=request.user,
        )
        ChatParticipant.objects.create(room=room, user=request.user, role=ChatParticipant.ROLE_OWNER)
        for member in members:
            if member.id == request.user.id:
                continue
            ChatParticipant.objects.get_or_create(room=room, user=member, defaults={'role': ChatParticipant.ROLE_MEMBER})

        return Response(ChatRoomSerializer(room, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ChatChannelDetailView(APIView):
    def patch(self, request, room_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or room.room_type != ChatRoom.TYPE_CHANNEL:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        participant = room.chat_participants.filter(user=request.user).first()
        if not participant:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if participant.role != ChatParticipant.ROLE_OWNER and not can_manage_sprints(request.user):
            return Response({'detail': 'Only owner/admin/project manager can edit channel'}, status=status.HTTP_403_FORBIDDEN)

        if 'name' in request.data:
            name = (request.data.get('name') or '').strip()
            if not name:
                return Response({'detail': 'name cannot be blank'}, status=status.HTTP_400_BAD_REQUEST)
            room.name = name
        if 'isPrivate' in request.data:
            room.is_private = bool(request.data.get('isPrivate'))
        room.save(update_fields=['name', 'is_private', 'updated_at'])
        return Response(ChatRoomSerializer(room, context={'request': request}).data)


class ChatChannelMemberAddView(APIView):
    def post(self, request, room_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or room.room_type != ChatRoom.TYPE_CHANNEL:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        participant = room.chat_participants.filter(user=request.user).first()
        if not participant:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if participant.role != ChatParticipant.ROLE_OWNER and not can_manage_sprints(request.user):
            return Response({'detail': 'Only owner/admin/project manager can add members'}, status=status.HTTP_403_FORBIDDEN)

        user = _user_by_uid(request.data.get('userId'))
        if not user:
            return Response({'detail': 'userId is required'}, status=status.HTTP_400_BAD_REQUEST)
        ChatParticipant.objects.get_or_create(room=room, user=user, defaults={'role': ChatParticipant.ROLE_MEMBER})
        return Response(ChatRoomSerializer(room, context={'request': request}).data)


class ChatChannelMemberRemoveView(APIView):
    def delete(self, request, room_uid, user_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or room.room_type != ChatRoom.TYPE_CHANNEL:
            return Response(status=status.HTTP_204_NO_CONTENT)
        participant = room.chat_participants.filter(user=request.user).first()
        if not participant:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if participant.role != ChatParticipant.ROLE_OWNER and not can_manage_sprints(request.user):
            return Response({'detail': 'Only owner/admin/project manager can remove members'}, status=status.HTTP_403_FORBIDDEN)

        user = _user_by_uid(user_uid)
        if not user:
            return Response(status=status.HTTP_204_NO_CONTENT)
        room.chat_participants.filter(user=user).exclude(role=ChatParticipant.ROLE_OWNER).delete()
        return Response(ChatRoomSerializer(room, context={'request': request}).data)


class ChatRoomMessagesView(APIView):
    def get(self, request, room_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or not _is_chat_member(room, request.user):
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        limit = min(max(int(request.query_params.get('limit', 50)), 1), 100)
        before_uid = request.query_params.get('before')
        qs = ChatMessage.objects.filter(room=room).select_related('sender__profile').order_by('-created_at')
        if before_uid:
            before_msg = ChatMessage.objects.filter(room=room, uid=before_uid).first()
            if before_msg:
                qs = qs.filter(created_at__lt=before_msg.created_at)
        messages = list(qs[:limit])
        messages.reverse()
        return Response(ChatMessageSerializer(messages, many=True).data)

    def post(self, request, room_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or not _is_chat_member(room, request.user):
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        message = ChatMessage.objects.create(room=room, sender=request.user, content=content)
        room.save(update_fields=['updated_at'])
        payload = ChatMessageSerializer(message).data
        _emit_chat_event(room, 'message_created', payload)

        recipients = room.participants.exclude(id=request.user.id)
        room_name = room.name or 'Direct Message'
        _create_notifications(
            recipients,
            title=f"New message in {room_name}" if room.room_type == ChatRoom.TYPE_CHANNEL else f"New message from {request.user.get_full_name() or request.user.username}",
            message=content[:160],
            notification_type=Notification.TYPE_CHAT,
            actor=request.user,
            action_url='/chat',
            metadata={'roomId': room.uid, 'roomType': room.room_type, 'projectId': room.project.uid if room.project else None},
        )
        return Response(payload, status=status.HTTP_201_CREATED)


class ChatMessageDetailView(APIView):
    def patch(self, request, message_uid):
        message = _chat_message_by_uid(message_uid)
        if not message:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_chat_member(message.room, request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if message.sender_id != request.user.id and not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        message.content = content
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save(update_fields=['content', 'is_edited', 'edited_at', 'updated_at'])
        payload = ChatMessageSerializer(message).data
        _emit_chat_event(message.room, 'message_updated', payload)
        return Response(payload)

    def delete(self, request, message_uid):
        message = _chat_message_by_uid(message_uid)
        if not message:
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not _is_chat_member(message.room, request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if message.sender_id != request.user.id and not can_manage_sprints(request.user):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.content = '[deleted]'
        message.save(update_fields=['is_deleted', 'deleted_at', 'content', 'updated_at'])
        payload = ChatMessageSerializer(message).data
        _emit_chat_event(message.room, 'message_deleted', payload)
        return Response(payload)


class ChatRoomReadView(APIView):
    def post(self, request, room_uid):
        room = _chat_room_by_uid(room_uid)
        if not room or not _is_chat_member(room, request.user):
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        participant = room.chat_participants.filter(user=request.user).first()
        if not participant:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        message_uid = request.data.get('messageId')
        target = ChatMessage.objects.filter(room=room, uid=message_uid).first() if message_uid else room.messages.order_by('-created_at').first()
        participant.last_read_message = target
        participant.last_read_at = timezone.now()
        participant.save(update_fields=['last_read_message', 'last_read_at'])
        _emit_chat_event(
            room,
            'read_receipt',
            {
                'roomId': room.uid,
                'userId': request.user.profile.uid,
                'messageId': target.uid if target else None,
                'readAt': participant.last_read_at.isoformat(),
            },
        )
        return Response({'success': True})


class DashboardReportView(APIView):
    def get(self, request):
        project_uid = request.query_params.get('project_id')
        project = _project_by_uid(project_uid)
        if not project:
            return Response({'detail': 'Invalid project_id'}, status=status.HTTP_400_BAD_REQUEST)

        active_sprint = Sprint.objects.filter(project=project, status='active').first()
        sprint_issues = Issue.objects.filter(project=project, sprint=active_sprint) if active_sprint else Issue.objects.none()

        by_status = {'todo': 0, 'in_progress': 0, 'in_review': 0, 'done': 0}
        for row in sprint_issues.values('status'):
            by_status[row['status']] += 1

        total = sprint_issues.count()
        done_percent = round((by_status['done'] / total) * 100) if total else 0
        by_assignee = defaultdict(int)
        for item in sprint_issues.exclude(assignee=None).values('assignee__profile__uid'):
            by_assignee[item['assignee__profile__uid']] += 1

        recent_issues = Issue.objects.filter(project=project).order_by('-updated_at')[:5]
        return Response({
            'activeSprintId': active_sprint.uid if active_sprint else None,
            'stats': {
                'byStatus': by_status,
                'total': total,
                'donePercent': done_percent,
                'byAssignee': by_assignee,
            },
            'recentActivity': IssueSerializer(recent_issues, many=True, context={'request': request}).data,
        })


class BurndownReportView(APIView):
    def get(self, request):
        sprint = _sprint_by_uid(request.query_params.get('sprint_id'))
        if not sprint:
            return Response([])

        start = sprint.start_date
        end = sprint.end_date
        total_issues = sprint.issues.count()
        days = (end - start).days or 1
        data = []
        for idx in range(days + 1):
            day = start + timedelta(days=idx)
            done_issues = 0
            for issue in sprint.issues.filter(status='done'):
                if issue.updated_at.date() <= day:
                    done_issues += 1
            remaining = max(total_issues - done_issues, 0)
            ideal = max(round(total_issues - ((total_issues / days) * idx), 1), 0)
            data.append({'date': day.isoformat(), 'remaining': remaining, 'ideal': ideal})
        return Response(data)


class VelocityReportView(APIView):
    def get(self, request):
        project = _project_by_uid(request.query_params.get('project_id'))
        if not project:
            return Response([])
        sprints = Sprint.objects.filter(project=project).order_by('start_date')
        payload = []
        for sprint in sprints:
            sprint_issues = Issue.objects.filter(sprint=sprint)
            committed = sprint_issues.count()
            completed = sprint_issues.filter(status='done').count()
            payload.append({'sprint': sprint.name, 'committed': committed, 'completed': completed})
        return Response(payload)


class NotificationListView(APIView):
    def get(self, request):
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        notifications = Notification.objects.filter(user=request.user)
        if unread_only:
            notifications = notifications.filter(is_read=False)
        return Response(NotificationSerializer(notifications[:50], many=True).data)


class NotificationUnreadCountView(APIView):
    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unreadCount': count})


class NotificationMarkReadView(APIView):
    def post(self, request, notification_uid):
        notification = Notification.objects.filter(uid=notification_uid, user=request.user).first()
        if not notification:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'user_notifications_{request.user.id}',
                {'type': 'notification_event', 'event': 'read'},
            )
        return Response({'success': True})


class NotificationReadAllView(APIView):
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'user_notifications_{request.user.id}',
                {'type': 'notification_event', 'event': 'read_all'},
            )
        return Response({'success': True})
