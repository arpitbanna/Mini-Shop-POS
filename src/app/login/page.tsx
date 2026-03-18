'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { verifyPassword } from '../actions/auth';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginAsAdmin, loginAsGuest } = useAuthStore();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        loginAsAdmin();
        toast.success('Logged in successfully');
        router.push('/');
      } else {
        toast.error('Incorrect password');
      }
    } catch {
      toast.error('Failed to verify password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    toast.success('Entering Guest Mode');
    router.push('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="glass-panel max-w-sm w-full p-8 flex flex-col gap-6 relative overflow-hidden backdrop-blur-2xl">
        {/* Glow effect back */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>

        <div className="text-center mb-4 mt-2">
          <div className="bg-primary/20 p-3 rounded-full w-fit mx-auto mb-4 border border-primary/30">
            <Lock size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Mini Shop POS</h1>
          <p className="text-sm text-muted">Manage your hostel sales efficiently</p>
        </div>

        <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-4 outline-none focus:border-primary/50 transition-colors text-white placeholder:text-white/40"
                placeholder="Admin Password"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-xl py-3 font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Verifying...' : 'Login as Admin'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-muted text-sm">Or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button 
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 font-semibold transition-all hover:scale-[1.02] active:scale-95 mb-2"
        >
          <User size={18} /> Continue as Guest
        </button>
      </div>
    </div>
  );
}
