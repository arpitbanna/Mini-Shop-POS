'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Home, PackageSearch, PlusCircle, ShoppingCart, DollarSign, LogOut, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';

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
  ];

  if (!isAdmin && !isGuest && pathname === '/login') {
    return <main className="container">{children}</main>;
  }

  if (!isAdmin && !isGuest) return null;

  return (
    <>
      <nav className="glass-nav z-40 relative">
        <div className="nav-container">
          <Link href="/" className="nav-brand">
            Mini Shop POS
          </Link>
          <div className="nav-links">
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="nav-item text-danger hover:text-danger cursor-pointer bg-transparent border-none"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
      {isGuest && (
        <div className="relative z-40 w-full border-y border-amber-300/45 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-slate-900 shadow-[0_10px_26px_-14px_rgba(251,191,36,0.95)]">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5">
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900"></span>
            <span className="uppercase">Guest Mode (Demo Data) - Write actions are disabled</span>
          </div>
        </div>
      )}
      <main className="container pt-6">
        {children}
      </main>
    </>
  );
}
