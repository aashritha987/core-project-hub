import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const shortcuts: Record<string, string> = {
  'd': '/',
  'b': '/board',
  'l': '/backlog',
  's': '/sprints',
  'e': '/epics',
  'r': '/reports',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Skip if modifier keys are held (except for standalone shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const path = shortcuts[e.key.toLowerCase()];
      if (path) {
        e.preventDefault();
        navigate(path);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);
}

export const SHORTCUT_LABELS = [
  { key: 'D', action: 'Dashboard' },
  { key: 'B', action: 'Board' },
  { key: 'L', action: 'Backlog' },
  { key: 'S', action: 'Sprints' },
  { key: 'E', action: 'Epics' },
  { key: 'R', action: 'Reports' },
  { key: '⌘K', action: 'Command Palette' },
];
