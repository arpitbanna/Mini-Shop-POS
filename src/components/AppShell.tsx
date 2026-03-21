'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Home, PackageSearch, PlusCircle, ShoppingCart, DollarSign, LogOut, BarChart3, History } from 'lucide-react';
import { usePathname } from 'next/navigation';
import styles from './app-shell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, isGuest, logout } = useAuthStore();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home, exact: true },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/add-sale', label: 'Sale', icon: ShoppingCart },
    { href: '/add-stock', label: 'Stock In', icon: PlusCircle },
    { href: '/inventory', label: 'Inventory', icon: PackageSearch },
    { href: '/payments', label: 'Payments', icon: DollarSign },
    { href: '/history', label: 'History', icon: History },
  ];

  if (!isAdmin && !isGuest && pathname === '/login') {
    return <main className={styles.mainContainer}>{children}</main>;
  }

  if (!isAdmin && !isGuest) return null;

  return (
    <>
      <nav className={styles.glassNav}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.navBrand}>
            Mini Shop POS
          </Link>
          <div className={styles.navLinks}>
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={logout}
              className={`${styles.navItem} ${styles.navLogout}`}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
      {isGuest && (
        <div className={styles.guestBanner}>
          <div className={styles.guestBannerInner}>
            <span className={styles.pulseDot}></span>
            <span>GUEST MODE (DEMO DATA) - WRITE ACTIONS ARE DISABLED</span>
          </div>
        </div>
      )}
      <main className={styles.mainContainer}>
        {children}
      </main>
    </>
  );
}
