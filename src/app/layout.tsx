import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Home, PackageSearch, PlusCircle, ShoppingCart, DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hostel Shop POS',
  description: 'Manage hostel mini shop sales and inventory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="glass-nav">
          <div className="nav-container">
            <Link href="/" className="nav-brand">
              Mini Shop POS
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-item">
                <Home size={18} /><span>Dashboard</span>
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
            </div>
          </div>
        </nav>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
