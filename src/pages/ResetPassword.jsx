import { useState } from 'react';
import { motion } from 'framer-motion';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/api/firebase';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!resetToken) { setError('Invalid reset link'); return; }
    setLoading(true);
    try {
      await verifyPasswordResetCode(auth, resetToken);
      await confirmPasswordReset(auth, resetToken, password);
      window.location.href = '/login';
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.code === 'auth/expired-action-code' ? 'Reset link has expired' : (err.message || 'Reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-2xl">New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a new password</p>
        </div>
        <div className="rounded-2xl glass-strong p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11 rounded-xl" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}