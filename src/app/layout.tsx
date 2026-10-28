import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'EduManager · Gestion scolaire', description: 'La gestion quotidienne de votre école de soutien scolaire.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
