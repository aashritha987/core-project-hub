import { useMemo, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, User, UserRole } from '@/types/jira';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';

const roleOptions: UserRole[] = ['admin', 'project_manager', 'developer', 'viewer'];

export default function UserManagement() {
  const { users, createUserAccount, updateUserAccount, deleteUserAccount } = useProject();
  const { canManageProject, currentUser } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('developer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name)), [users]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('developer');
    setPassword('');
    setError('');
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword('');
    setError('');
  };

  const onCreate = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name, email and password (min 6 chars) are required.');
      return;
    }
    try {
      await createUserAccount({ name: name.trim(), email: email.trim(), role, password });
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const onUpdate = async () => {
    if (!editUser || !name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    try {
      await updateUserAccount(editUser.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        ...(password ? { password } : {}),
      });
      setEditUser(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const onDelete = async (user: User) => {
    if (!confirm(`Delete user ${user.name}?`)) return;
    try {
      await deleteUserAccount(user.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (!canManageProject()) {
    return (
      <div className="p-6 max-w-3xl">
        <Card className="border shadow-sm">
          <CardContent className="py-10 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-base font-semibold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mt-1">Only admins can manage users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and remove users</p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add User
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Team Members ({sortedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 border border-border rounded-md">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{user.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <Badge variant="outline" className="text-2xs">{ROLE_LABELS[user.role]}</Badge>
              {user.id === currentUser?.id && <Badge variant="secondary" className="text-2xs">You</Badge>}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={user.id === currentUser?.id} onClick={() => onDelete(user)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={createOpen || !!editUser} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditUser(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Password {editUser ? '(optional)' : ''}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setCreateOpen(false); setEditUser(null); resetForm(); }}>Cancel</Button>
              <Button size="sm" onClick={editUser ? onUpdate : onCreate}>{editUser ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
