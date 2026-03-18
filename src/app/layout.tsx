import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';
import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';

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
        <Providers>
          <AuthGuard>
            <AppShell>
              {children}
            </AppShell>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
