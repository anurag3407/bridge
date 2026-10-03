import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../lib/query-provider';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'Bridge Operations Platform',
  description: 'Interactive 3D bridge inspection and operator-reported road condition platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
        <QueryProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
