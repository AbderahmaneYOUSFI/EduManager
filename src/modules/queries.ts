import { db } from '@/lib/db';
import { type Actor, DomainError } from '@/lib/domain';
import { chargeLedger } from './finance';
export async function loadSchool(actor: Actor) {
  const teacher = actor.role === 'PROFESSEUR';
  if (teacher && !actor.teacherId) throw new DomainError('Compte professeur sans profil associé.', 403);
  const scope = teacher ? { teacherId: actor.teacherId! } : {};
  const [students, teachers, subjects, levels, rooms, groups, enrollments, sessions, payments, charges, users, audits] = await Promise.all([
    db.student.findMany({ where: teacher ? { enrollments: { some: { group: scope } } } : {}, include: { guardians: !teacher }, orderBy: { lastName: 'asc' } }),
    teacher ? [] : db.teacher.findMany({ orderBy: { name: 'asc' } }),
    teacher ? [] : db.subject.findMany({ orderBy: { name: 'asc' } }),
    teacher ? [] : db.level.findMany({ orderBy: { name: 'asc' } }),
    teacher ? [] : db.room.findMany({ orderBy: { name: 'asc' } }),
    db.group.findMany({ where: scope, include: { teacher: true, subject: true, level: true, _count: { select: { enrollments: true } } }, orderBy: { name: 'asc' } }),
    db.enrollment.findMany({ where: teacher ? { group: scope } : {}, include: { student: true, group: true, subscription: !teacher }, orderBy: { startsOn: 'desc' } }),
    db.classSession.findMany({ where: scope, include: { group: true, room: true, teacher: true, attendances: true }, orderBy: { startsAt: 'desc' }, take: 1000 }),
    teacher ? [] : db.payment.findMany({ include: { student: true }, orderBy: { paidAt: 'desc' } }),
    teacher ? [] : chargeLedger(),
    actor.role === 'ADMIN' ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, disabled: true } }) : [],
    actor.role === 'ADMIN' ? db.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }) : [],
  ]);
  // Explicit DTOs prevent accidental leakage of contact details and financial fields to teachers.
  return {
    students: students.map(s => ({ id: s.id, label: `${s.firstName} ${s.lastName}`, code: s.code, firstName: s.firstName, lastName: s.lastName, archived: s.archived, phone: teacher ? null : s.phone, guardians: teacher ? [] : s.guardians.map(g => ({ id: g.id, name: g.name, phone: g.phone, relationship: g.relationship })) })),
    teachers: teachers.map(t => ({ id: t.id, label: t.name, phone: t.phone, email: t.email, archived: t.archived })),
    subjects: subjects.map(s => ({ ...s, label: s.name })), levels: levels.map(s => ({ ...s, label: s.name })), rooms: rooms.map(s => ({ ...s, label: s.name })),
    groups: groups.map(g => ({ id: g.id, label: g.name, teacher: g.teacher.name, subject: g.subject.name, level: g.level.name, capacity: g.capacity, archived: g.archived, monthlyPrice: teacher ? null : g.monthlyPrice.toFixed(2) })),
    enrollments: enrollments.map(e => ({ id: e.id, studentId: e.studentId, groupId: e.groupId, label: `${e.student.firstName} ${e.student.lastName} · ${e.group.name}`, student: `${e.student.firstName} ${e.student.lastName}`, group: e.group.name, startsOn: e.startsOn.toISOString().slice(0,10), endsOn: e.endsOn?.toISOString().slice(0,10) ?? null, agreedAmount: teacher ? null : e.subscription?.agreedAmount.toFixed(2) ?? null })),
    sessions: sessions.map(s => ({ id: s.id, groupId: s.groupId, label: `${s.group.name} · ${new Intl.DateTimeFormat('fr-DZ', { timeZone: 'Africa/Algiers', dateStyle: 'short', timeStyle: 'short' }).format(s.startsAt)}`, title: s.group.name, room: s.room.name, teacher: s.teacher.name, start: s.startsAt.toISOString(), end: s.endsAt.toISOString(), status: s.status, attendances: s.attendances.map(a => ({ enrollmentId: a.enrollmentId, status: a.status })) })),
    payments: payments.map(p => ({ id: p.id, student: `${p.student.firstName} ${p.student.lastName}`, amount: p.amount.toFixed(2), method: p.method, status: p.status, receiptNumber: p.receiptNumber, paidAt: p.paidAt.toISOString() })),
    charges, users, audits: audits.map(a => ({ id: a.id, actor: a.actor.name, action: a.action, entityId: a.entityId, createdAt: a.createdAt.toISOString() })),
  };
}
export type SchoolData = Awaited<ReturnType<typeof loadSchool>>;
