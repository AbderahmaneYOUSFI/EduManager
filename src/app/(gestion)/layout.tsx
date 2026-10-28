import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, LayoutDashboard, Users, BookOpen, CalendarDays, ClipboardCheck, Wallet, Layers, Settings, UserRound } from 'lucide-react';
import { currentActor } from '@/lib/auth';
import { DomainError } from '@/lib/domain';
import { SignOut } from '@/components/sign-out';
import { NavLink } from '@/components/nav-link';
const links = [ ['dashboard','Vue d’ensemble',LayoutDashboard], ['eleves','Élèves',Users], ['professeurs','Professeurs',UserRound], ['groupes','Groupes & inscriptions',Layers], ['matieres','Matières & salles',BookOpen], ['planning','Emploi du temps',CalendarDays], ['presences','Présences',ClipboardCheck], ['abonnements','Mensualités',Wallet], ['paiements','Encaissements',Wallet], ['parametres','Administration',Settings] ] as const;
export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  let actor;
  try { actor = await currentActor(); } catch (e) { if (e instanceof DomainError && e.status === 401) redirect('/connexion'); throw e; }
  const allowed = actor.role === 'PROFESSEUR' ? ['dashboard','groupes','planning','presences'] : actor.role === 'ADMIN' ? links.map(l => l[0]) : links.map(l => l[0]).filter(l => l !== 'parametres');
  return <div className="workspace"><aside className="sidebar"><Link href="/dashboard" className="brand"><span><GraduationCap size={25} /></span>EduManager<span className="brand-dot">.</span></Link><div className="school-label"><span className="school-avatar">E</span><div>{process.env.SCHOOL_NAME || 'Mon établissement'}<small>École de soutien scolaire</small></div></div><p className="nav-label">ESPACE DE GESTION</p><nav>{links.filter(l => allowed.includes(l[0])).map(([path,label,Icon]) => <NavLink key={path} href={`/${path}`}><Icon size={18} />{label}</NavLink>)}</nav><div className="sidebar-bottom"><div className="user-avatar">{actor.name.slice(0,1)}</div><div><strong>{actor.name}</strong><small>{actor.role === 'ADMIN' ? 'Direction' : actor.role === 'SECRETAIRE' ? 'Secrétariat' : 'Professeur'}</small><SignOut /></div></div></aside><div className="main-shell"><header className="topbar"><span><span className="status-dot" /> Espace de gestion scolaire</span><span className="topbar-account"><SignOut />{new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'long', timeZone: 'Africa/Algiers' }).format(new Date())}</span></header><main className="content">{children}</main><footer className="app-footer">EduManager · L’école avance, ensemble.<span>Montants en dinars algériens · Heure d’Alger</span></footer></div></div>;
}
