import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import { ArrowUpRight, Users, Layers, Wallet, Clock3 } from 'lucide-react';
import { currentActor } from '@/lib/auth';
import { formatMoney, DomainError } from '@/lib/domain';
import { loadSchool } from '@/modules/queries';
import { EntityForm, type Field } from '@/components/entity-form';
import { RevenueChart } from '@/components/charts';
import { Calendar } from '@/components/calendar';
const titles: Record<string, [string,string]> = {
  dashboard: ['Vue d’ensemble','Une vision claire de votre école, au quotidien.'], eleves: ['Les élèves','Chaque parcours commence par une bonne organisation.'], professeurs: ['L’équipe pédagogique','Les talents qui font progresser vos élèves.'], groupes: ['Groupes & inscriptions','Les bons élèves, dans les bons groupes.'], matieres: ['Matières, niveaux & salles','Les repères de votre organisation pédagogique.'], planning: ['Emploi du temps','Une semaine organisée, des cours sereins.'], presences: ['Présences & absences','Suivez l’assiduité, séance après séance.'], abonnements: ['Mensualités & impayés','Des échéances claires et des tarifs conservés.'], paiements: ['Encaissements','Chaque règlement, suivi et justifié.'], parametres: ['Administration','Les accès et la traçabilité de votre établissement.'],
};
const field = (name: string, label: string, type = 'text', required = true): Field => ({ name, label, type, required });
const select = (name: string, label: string, options: { id: string; label: string }[], required = true): Field => ({ name,label,options,required });
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}><div className="empty-state"><BookIcon /><strong>Tout commence ici</strong><p>Ajoutez vos premières données à l’aide des formulaires ci-dessus.</p></div></td></tr>}</tbody></table></div>; }
function BookIcon() { return <Layers size={28} strokeWidth={1.2} />; }
const badge = (value: string, good = true) => <span className={`badge ${good ? 'badge-green' : 'badge-amber'}`}>{value}</span>;
const date = (v: string) => new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'short', timeZone: 'Africa/Algiers' }).format(new Date(v));
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!titles[module]) notFound();
  let actor;
  try { actor = await currentActor(); } catch (error) { if (error instanceof DomainError && error.status === 401) redirect('/connexion'); throw error; }
  const isTeacher = actor.role === 'PROFESSEUR';
  if (isTeacher && !['dashboard','groupes','planning','presences'].includes(module) || module === 'parametres' && actor.role !== 'ADMIN') return <section className="panel"><h1>Accès réservé</h1><p>Votre rôle ne donne pas accès à cet espace.</p></section>;
  const data = await loadSchool(actor);
  const [title, subtitle] = titles[module];
  const activeStudents = data.students.filter(s => !s.archived), activeGroups = data.groups.filter(g => !g.archived);
  const studentOptions = activeStudents.map(s => ({ id: s.id, label: `${s.code} · ${s.label}` }));
  const groupOptions = activeGroups.map(g => ({ id: g.id, label: g.label }));
  const form = (action: string, title: string, fields: Field[], submitLabel?: string) => <EntityForm key={action} action={action} title={title} fields={fields} submitLabel={submitLabel} />;
  const totalPaid = data.payments.filter(p => p.status === 'VALIDATED').reduce((a,p) => a.plus(p.amount), new Decimal(0));
  const outstanding = data.charges.reduce((a,c) => a.plus(c.remaining), new Decimal(0));
  const overdue = data.charges.filter(c => c.overdue);
  return <><div className="page-heading"><div><p className="eyebrow">{module === 'dashboard' ? 'VOTRE ÉCOLE EN UN REGARD' : 'ORGANISATION & SUIVI'}</p><h1>{title}<span className="heading-dot">.</span></h1><p>{subtitle}</p></div>{module === 'dashboard' && !isTeacher && <Link className="button button-primary" href="/eleves">Inscrire un élève <ArrowUpRight size={17} /></Link>}</div>
    {module === 'dashboard' && <>
      <section className="welcome-banner"><div><span className="badge badge-light">Le quotidien, en toute clarté</span><h2>Bonjour, {actor.name.split(' ')[0]}.</h2><p>Retrouvez vos élèves, votre planning et les actions à suivre.</p><Link href="/planning">Consulter le planning <ArrowUpRight size={16} /></Link></div><div className="banner-art" aria-hidden="true"><div className="art-orbit" /><GraduationShape /></div></section>
      <div className="stats-grid">{[[Users, 'Élèves suivis', String(activeStudents.length), 'Parcours enregistrés'],[Layers,'Groupes actifs',String(activeGroups.length),'Apprendre, ensemble'],[Wallet,isTeacher ? 'Séances programmées' : 'Encaissements',isTeacher ? String(data.sessions.filter(s => s.status === 'SCHEDULED').length) : formatMoney(totalPaid.toFixed(2)),isTeacher ? 'Dans vos groupes' : 'Paiements validés affichés'],[Clock3,isTeacher ? 'Présences relevées' : 'Reste à encaisser',isTeacher ? String(data.sessions.reduce((a,s) => a + s.attendances.length,0)) : formatMoney(outstanding.toFixed(2)),isTeacher ? 'Suivi pédagogique' : `${overdue.length} mensualité(s) en retard`]].map(([Icon,label,value,hint]) => { const I = Icon as typeof Users; return <div className="stat-card" key={String(label)}><div className="stat-top"><span>{String(label)}</span><I size={20} /></div><strong>{String(value)}</strong><small>{String(hint)}</small></div>; })}</div>
      <div className="dashboard-grid"><section className="panel"><div className="section-heading"><h2>{isTeacher ? 'Vos prochaines séances' : 'Les encaissements'}</h2><span className="muted">{isTeacher ? 'À venir' : '6 derniers mois'}</span></div>{isTeacher ? <SessionList sessions={data.sessions} /> : <RevenueChart data={Array.from({ length: 6 }, (_,i) => { const now = new Date(); const d = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth() - 5 + i,1)); const period = d.toISOString().slice(0,7); return { month: new Intl.DateTimeFormat('fr', { month: 'short', timeZone: 'UTC' }).format(d), amount: data.payments.filter(p => p.status === 'VALIDATED' && p.paidAt.slice(0,7) === period).reduce((a,p) => a.plus(p.amount), new Decimal(0)).toNumber() }; })} />}</section><section className="panel"><div className="section-heading"><h2>À suivre</h2><span className="badge badge-green">Votre activité</span></div><div className="followup"><Clock3 /><div><strong>{isTeacher ? 'Gardez le lien avec vos élèves' : `${overdue.length} échéance(s) à régulariser`}</strong><p>{isTeacher ? 'Complétez les présences après chaque cours.' : 'Les soldes prennent en compte les paiements partiels et les annulations.'}</p><Link href={isTeacher ? '/presences' : '/abonnements'}>Voir le détail →</Link></div></div><div className="followup"><CalendarDaysIcon /><div><strong>Le prochain rendez-vous</strong><p>{data.sessions.filter(s => s.status !== 'CANCELLED' && new Date(s.start) >= new Date()).sort((a,b) => a.start.localeCompare(b.start))[0]?.label || 'Aucune séance à venir pour le moment.'}</p><Link href="/planning">Ouvrir le planning →</Link></div></div></section></div>
      <section className="panel"><div className="section-heading"><h2>Les prochains cours</h2><Link href="/planning">Tout le planning ↗</Link></div><SessionList sessions={data.sessions} /></section>
    </>}
    {module === 'eleves' && <>
      {form('student','Ajouter un élève',[field('firstName','Prénom'),field('lastName','Nom'),field('birthDate','Date de naissance','date',false),field('phone','Téléphone','tel',false),field('guardianName','Responsable légal','text',false),field('guardianPhone','Téléphone du responsable','tel',false),field('relationship','Lien de parenté','text',false)])}
      {form('guardian','Ajouter un responsable légal',[select('studentId','Élève',studentOptions),field('name','Nom complet'),field('phone','Téléphone','tel'),field('relationship','Lien de parenté')])}
      {form('updateStudent','Modifier la fiche d’un élève',[select('id','Élève',studentOptions),field('firstName','Prénom'),field('lastName','Nom'),field('phone','Téléphone','tel',false)])}
      {form('archive','Archiver un élève',[select('kind','Type',[{id:'student',label:'Élève'}]),select('id','Élève',studentOptions)])}
      <Table headers={['Élève','Matricule','Téléphone','Responsables légaux','Statut']} rows={data.students.map(s => [<strong key="name">{s.label}</strong>,s.code,s.phone || '—',s.guardians.map(g => `${g.name} (${g.relationship}) · ${g.phone}`).join(' / ') || '—',badge(s.archived ? 'Archivé' : 'Actif',!s.archived)])} />
    </>}
    {module === 'professeurs' && <>
      {form('teacher','Ajouter un professeur',[field('name','Nom complet'),field('email','Adresse e-mail','email',false),field('phone','Téléphone','tel',false)])}
      {form('updateTeacher','Modifier un professeur',[select('id','Professeur',data.teachers),field('name','Nom complet'),field('email','Adresse e-mail','email',false),field('phone','Téléphone','tel',false)])}
      {form('archive','Archiver un professeur',[select('kind','Type',[{id:'teacher',label:'Professeur'}]),select('id','Professeur',data.teachers.filter(t => !t.archived))])}
      <Table headers={['Professeur','E-mail','Téléphone','Statut']} rows={data.teachers.map(t => [<strong key="name">{t.label}</strong>,t.email || '—',t.phone || '—',badge(t.archived ? 'Archivé' : 'Actif',!t.archived)])} />
    </>}
    {module === 'matieres' && <>
      <div className="forms-row">{form('subject','Ajouter une matière',[field('name','Matière')])}{form('level','Ajouter un niveau',[field('name','Niveau')])}{form('room','Ajouter une salle',[field('name','Nom de la salle'),field('capacity','Capacité','number')])}</div>
      <h2 className="subheading">Matières</h2><Table headers={['Matière']} rows={data.subjects.map(s => [s.name])} /><h2 className="subheading">Niveaux</h2><Table headers={['Niveau']} rows={data.levels.map(s => [s.name])} /><h2 className="subheading">Salles</h2><Table headers={['Salle','Capacité']} rows={data.rooms.map(s => [s.name,`${s.capacity} places`])} />
    </>}
    {module === 'groupes' && <>
      {!isTeacher && <>{form('group','Créer un groupe',[field('name','Nom du groupe'),select('subjectId','Matière',data.subjects),select('levelId','Niveau',data.levels),select('teacherId','Professeur',data.teachers.filter(t => !t.archived)),field('capacity','Capacité','number'),field('monthlyPrice','Tarif mensuel (DZD)')])}
      {form('enrollment','Inscrire un élève dans un groupe',[select('studentId','Élève',studentOptions),select('groupId','Groupe',groupOptions),field('startsOn','Date de début','date'),select('subscribe','Abonnement mensuel',[{id:'true',label:'Oui · tarif du groupe'},{id:'false',label:'Sans abonnement'}])])}
      {form('endEnrollment','Clôturer une inscription',[select('id','Inscription',data.enrollments.filter(e => !e.endsOn)),field('endsOn','Dernier jour inclus','date')])}
      {form('price','Modifier le tarif des futures inscriptions',[select('id','Groupe',groupOptions),field('monthlyPrice','Nouveau tarif (DZD)')])}
      {form('archive','Archiver un groupe',[select('kind','Type',[{id:'group',label:'Groupe'}]),select('id','Groupe',groupOptions)])}</>}
      <Table headers={['Groupe','Matière · niveau','Professeur','Capacité',...(!isTeacher ? ['Tarif mensuel'] : []),'Statut']} rows={data.groups.map(g => [<strong key="name">{g.label}</strong>,`${g.subject} · ${g.level}`,g.teacher,g.capacity,...(!isTeacher ? [formatMoney(g.monthlyPrice!)] : []),badge(g.archived ? 'Archivé' : 'Actif',!g.archived)])} />
      <h2 className="subheading">Inscriptions</h2><Table headers={['Élève','Groupe','Début','Fin',...(!isTeacher ? ['Abonnement'] : [])]} rows={data.enrollments.map(e => [e.student,e.group,date(e.startsOn),e.endsOn ? date(e.endsOn) : 'En cours',...(!isTeacher ? [e.agreedAmount ? formatMoney(e.agreedAmount) : 'Sans abonnement'] : [])])} />
    </>}
    {module === 'planning' && <>
      {!isTeacher && <>{form('session','Planifier un cours ou une série hebdomadaire',[select('groupId','Groupe',groupOptions),select('roomId','Salle',data.rooms),field('startsAt','Début · heure d’Alger','datetime-local'),field('endsAt','Fin · heure d’Alger','datetime-local'),{...field('weeks','Nombre de semaines','number'),value:'1',min:'1'}])}{form('cancelSession','Annuler une séance',[select('id','Séance',data.sessions.filter(s => s.status !== 'CANCELLED')),field('reason','Motif')])}</>}
      <section className="panel calendar"><Calendar events={data.sessions} /></section>
    </>}
    {module === 'presences' && <>
      {form('attendance','Relever ou corriger une présence',[select('sessionId','Séance',data.sessions.filter(s => s.status !== 'CANCELLED' && new Date(s.start) <= new Date())),select('enrollmentId','Inscription',data.enrollments),select('status','Statut',[{id:'PRESENT',label:'Présent'},{id:'ABSENT',label:'Absent'},{id:'LATE',label:'En retard'},{id:'EXCUSED',label:'Absence justifiée'}]),field('comment','Commentaire','text',false)])}
      <Table headers={['Séance','Élève','Présence']} rows={data.sessions.flatMap(s => s.attendances.map(a => [s.label,data.enrollments.find(e => e.id === a.enrollmentId)?.student || '—',badge(({PRESENT:'Présent',ABSENT:'Absent',LATE:'En retard',EXCUSED:'Justifié'})[a.status],a.status === 'PRESENT')]))} />
    </>}
    {module === 'abonnements' && <>
      <div className="info-note">Tout mois commencé est facturé intégralement. Échéance le 10 du mois. La génération répétée ne crée aucun doublon.</div>
      {form('generate','Générer les mensualités d’un mois',[{...field('period','Mois civil','month'),value:new Date().toISOString().slice(0,7)}],'Générer les mensualités')}
      <Table headers={['Élève','Groupe','Mois','Montant','Solde','Échéance','État']} rows={data.charges.map(c => [c.student,c.group,c.period,formatMoney(c.amount),formatMoney(c.remaining),date(c.dueOn),badge(new Decimal(c.remaining).isZero() ? 'Réglé' : c.overdue ? 'En retard' : 'À régler',!c.overdue)])} />
    </>}
    {module === 'paiements' && <>
      {form('payment','Enregistrer un encaissement',[select('studentId','Élève',studentOptions),field('amount','Montant (DZD)'),select('method','Mode de paiement',[{id:'CASH',label:'Espèces'},{id:'TRANSFER',label:'Virement'},{id:'CHEQUE',label:'Chèque'}])],'Valider l’encaissement')}
      {actor.role === 'ADMIN' && form('cancelPayment','Annuler un paiement avec traçabilité',[select('id','Paiement',data.payments.filter(p => p.status === 'VALIDATED').map(p => ({ id:p.id,label:`${p.student} · ${formatMoney(p.amount)} · ${date(p.paidAt)}` }))),field('reason','Motif de l’annulation')],'Annuler le paiement')}
      <Table headers={['Élève','Date','Montant','Mode','Statut','Reçu']} rows={data.payments.map(p => [p.student,date(p.paidAt),formatMoney(p.amount),({CASH:'Espèces',TRANSFER:'Virement',CHEQUE:'Chèque'})[p.method] || p.method,badge(p.status === 'VALIDATED' ? 'Validé' : 'Annulé',p.status === 'VALIDATED'),<a key="receipt" className="table-link" href={`/api/receipts/${p.id}`} target="_blank" rel="noreferrer">Télécharger PDF ↗</a>])} />
    </>}
    {module === 'parametres' && <>
      {form('user','Créer un compte utilisateur',[field('name','Nom complet'),field('email','E-mail','email'),field('password','Mot de passe · 12 caractères minimum','password'),select('role','Rôle',[{id:'ADMIN',label:'Direction'},{id:'SECRETAIRE',label:'Secrétariat'},{id:'PROFESSEUR',label:'Professeur'}]),select('teacherId','Profil professeur',data.teachers,false)])}
      {form('updateUser','Modifier les accès ou réinitialiser un mot de passe',[select('id','Utilisateur',data.users.map(u => ({id:u.id,label:`${u.name} · ${u.email}`}))),select('role','Rôle',[{id:'ADMIN',label:'Direction'},{id:'SECRETAIRE',label:'Secrétariat'},{id:'PROFESSEUR',label:'Professeur'}]),select('state','État',[{id:'ACTIVE',label:'Actif'},{id:'DISABLED',label:'Désactivé'}]),field('password','Nouveau mot de passe · 12 caractères minimum','password',false)])}
      <Table headers={['Utilisateur','E-mail','Rôle','État']} rows={data.users.map(u => [u.name,u.email,u.role,u.disabled ? 'Désactivé' : 'Actif'])} />
      <h2 className="subheading">Journal d’audit · 100 dernières actions</h2><Table headers={['Date','Acteur','Action','Référence']} rows={data.audits.map(a => [date(a.createdAt),a.actor,a.action,a.entityId])} />
    </>}
  </>;
}
function GraduationShape() { return <><div className="art-sheet"><span>Votre école</span><div /><div /><div /><strong>↗</strong></div><div className="art-check">✓</div></>; }
function CalendarDaysIcon() { return <Clock3 />; }
function SessionList({ sessions }: { sessions: { id: string; title: string; start: string; room: string; teacher: string; status: string }[] }) { const upcoming = sessions.filter(s => s.status !== 'CANCELLED' && new Date(s.start) >= new Date()).sort((a,b) => a.start.localeCompare(b.start)).slice(0,5); return <Table headers={['Cours','Date & heure','Salle','Professeur']} rows={upcoming.map(s => [<strong key={s.id}>{s.title}</strong>,new Intl.DateTimeFormat('fr-DZ',{ dateStyle:'short',timeStyle:'short',timeZone:'Africa/Algiers' }).format(new Date(s.start)),s.room,s.teacher])} />; }
