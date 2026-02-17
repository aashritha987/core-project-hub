from .models import UserProfile


def has_role(user, roles):
    if not user.is_authenticated:
        return False
    profile = getattr(user, 'profile', None)
    if not profile:
        return False
    return profile.role in roles


def can_manage_project(user):
    return has_role(user, [UserProfile.ROLE_ADMIN])


def can_manage_sprints(user):
    return has_role(user, [UserProfile.ROLE_ADMIN, UserProfile.ROLE_PM])


def can_edit_issue(user, issue):
    if has_role(user, [UserProfile.ROLE_ADMIN, UserProfile.ROLE_PM]):
        return True
    profile = getattr(user, 'profile', None)
    if not profile or profile.role != UserProfile.ROLE_DEV:
        return False
    return issue.assignee_id == user.id or issue.reporter_id == user.id
