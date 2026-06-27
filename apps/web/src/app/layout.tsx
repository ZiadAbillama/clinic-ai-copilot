import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clinic AI Copilot',
  description:
    'Staff dashboard for patients, appointments, notes, and human-reviewed AI summaries.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
