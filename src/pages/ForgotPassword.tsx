import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Columns3, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = forgotPassword(email);
    setMessage(result.message);
    setIsSuccess(result.success);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Columns3 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">Reset your password</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <Alert variant={isSuccess ? 'default' : 'destructive'} className="py-2">
                {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription className="text-sm">{message}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@company.com" required className="h-10" />
            </div>
            <Button type="submit" className="w-full h-10">Send Reset Link</Button>
          </form>
          <Link to="/login" className="flex items-center gap-1 justify-center text-sm text-primary hover:underline mt-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
