import { Epic, Issue, User } from '@/types/jira';

const contains = (value: string | null | undefined, query: string): boolean => {
  if (!value) return false;
  return value.toLowerCase().includes(query);
};

export function matchesIssueSearch(
  issue: Issue,
  rawQuery: string,
  users: User[],
  epics: Epic[],
): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const assignee = issue.assigneeId ? users.find((u) => u.id === issue.assigneeId) : null;
  const reporter = users.find((u) => u.id === issue.reporterId);
  const epic = issue.epicId ? epics.find((e) => e.id === issue.epicId) : null;

  return [
    issue.key,
    issue.title,
    issue.description,
    assignee?.name,
    reporter?.name,
    epic?.name,
  ].some((candidate) => contains(candidate, query));
}
