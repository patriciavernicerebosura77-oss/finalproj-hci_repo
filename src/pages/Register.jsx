import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/api/firebase'; // Naka-target sa bago mong firebase.js file

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Paunang pagsusuri kung tugma ang isinulat na passwords
    if (password !== confirmPassword) { 
      setError('Hindi magkatugma ang iyong isinulat na mga password.'); 
      return; 
    }

    setLoading(true);
    try {
      // Pinapatakbo ang Firebase registration command
      await createUserWithEmailAndPassword(auth, email, password);
      // Kapag nagtagumpay, automatic nang naka-login kaya ididirekta na natin sa Home dashboard
      window.location.href = '/';
    } catch (err) {
      console.error('Registration error logs:', err);
      // Pagsasalin ng karaniwang Firebase validation error codes para madaling maintindihan ng user
      if (err.code === 'auth/email-already-in-use') {
        setError('Ang email address na ito ay may rehistradong account na. Pakisuyong gumamit ng iba.');
      } else if (err.code === 'auth/weak-password') {
        setError('Masyadong mahina ang password. Gumamit ng hindi bababa sa 6 na characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Hindi wasto ang format ng isinulat mong email address.');
      } else {
        setError(err.message || 'May hindi inaasahang isyu habang sinusubukang irehistro ang iyong account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      // Mabilis na Google authentication registration popup handler
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/';
    } catch (err) {
      console.error('Google registration failure tracker:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Hindi nagtagumpay ang pag-verify sa iyong Google account configuration layer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="font-heading font-bold text-2xl">Create an Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with VoiceTranslate</p>
        </div>

        <div className="rounded-2xl glass-strong p-6 shadow-xl space-y-4">
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              Sign up with Google
            </Button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="name@example.com" 
                  className="pl-9" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  className="pl-9 pr-9" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  className="pl-9" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
