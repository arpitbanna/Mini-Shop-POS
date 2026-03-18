'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Home, PackageSearch, PlusCircle, ShoppingCart, DollarSign, LogOut, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, isGuest, logout } = useAuthStore();
  const pathname = usePathname();

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
            <Link href="/" className="nav-item">
              <Home size={18} /><span>Dashboard</span>
            </Link>
            <Link href="/analytics" className="nav-item">
              <BarChart3 size={18} /><span>Analytics</span>
            </Link>
            <Link href="/add-sale" className="nav-item">
              <ShoppingCart size={18} /><span>Sale</span>
            </Link>
            <Link href="/add-stock" className="nav-item">
              <PlusCircle size={18} /><span>Stock In</span>
            </Link>
            <Link href="/inventory" className="nav-item">
              <PackageSearch size={18} /><span>Inventory</span>
            </Link>
            <Link href="/payments" className="nav-item">
              <DollarSign size={18} /><span>Payments</span>
            </Link>
            <button onClick={logout} className="nav-item text-danger hover:text-danger/80 transition-colors ml-4 cursor-pointer flex items-center gap-1 bg-transparent border-none">
              <LogOut size={18} /><span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
      {isGuest && (
        <div className="bg-warning text-black text-center py-2 text-sm font-bold w-full relative z-40 flex items-center justify-center gap-2 shadow-lg">
          <span className="animate-pulse flex h-2 w-2 rounded-full bg-black"></span>
          Guest Mode (Demo Data) - Write actions are disabled
        </div>
      )}
      <main className="container pt-6">
        {children}
      </main>
    </>
  );
}
