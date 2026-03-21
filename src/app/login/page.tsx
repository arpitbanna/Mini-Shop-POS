'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { verifyPassword } from '../actions/auth';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import styles from './login.module.css';

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
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Glow effect back */}
        <div className={styles.glowTopRight}></div>
        <div className={styles.glowBotLeft}></div>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Lock size={24} />
          </div>
          <h1 className={styles.title}>Mini Shop POS</h1>
          <p className={styles.subtitle}>Manage your hostel sales efficiently</p>
        </div>

        <form onSubmit={handleAdminLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <div className={styles.inputWrap}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Admin Password"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className={styles.adminBtn}
          >
            {isLoading ? 'Verifying...' : 'Login as Admin'}
          </button>
        </form>

        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>Or</span>
          <div className={styles.dividerLine}></div>
        </div>

        <button 
          onClick={handleGuestLogin}
          className={styles.guestBtn}
        >
          <User size={18} /> Continue as Guest
        </button>
      </div>
    </div>
  );
}
