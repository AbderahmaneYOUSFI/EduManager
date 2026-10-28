import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { staff, admin, teacherScope, DomainError, type Actor } from '@/lib/domain';
import { serializable, audit } from '@/lib/transaction';
import { schemas, type Mutation } from './schemas';
import { generateCharges, collectPayment, cancelPayment } from './finance';

export async function mutate(actor: Actor, action: Mutation, input: unknown): Promise<unknown> {
  if (action === 'generate') return generateCharges(actor, input);
  if (action === 'payment') return collectPayment(actor, input);
  if (action === 'cancelPayment') return cancelPayment(actor, input);
  if (action !== 'attendance') staff(actor);
  if (action === 'user' || action === 'updateUser') admin(actor);
  // Parsing is also performed in each branch to retain inferred field types.
  schemas[action].parse(input);
  const password = action === 'user' ? schemas.user.parse(input).password : action === 'updateUser' ? schemas.updateUser.parse(input).password : null;
  const passwordHash = password ? await hash(password, 12) : null;
  return serializable(async tx => {
    let result: { id: string };
    switch (action) {
      case 'student': {
        const { guardianName, guardianPhone, relationship, ...data } = schemas.student.parse(input);
        result = await tx.student.create({ data: { ...data, code: `EL-${randomUUID().slice(0, 12).toUpperCase()}`, ...(guardianName && guardianPhone ? { guardians: { create: { name: guardianName, phone: guardianPhone, relationship: relationship || 'Responsable légal' } } } : {}) } });
        break;
      }
      case 'guardian': result = await tx.guardian.create({ data: schemas.guardian.parse(input) }); break;
      case 'teacher': result = await tx.teacher.create({ data: schemas.teacher.parse(input) }); break;
      case 'updateStudent': {
        const {id,...data} = schemas.updateStudent.parse(input);
        result = await tx.student.update({where:{id},data}); break;
      }
      case 'updateTeacher': {
        const {id,...data} = schemas.updateTeacher.parse(input);
        result = await tx.teacher.update({where:{id},data}); break;
      }
      case 'updateUser': {
        admin(actor);
        const {id,role,state} = schemas.updateUser.parse(input);
        const user = await tx.user.findUniqueOrThrow({where:{id},include:{teacher:true}});
        if (role === 'PROFESSEUR' && !user.teacher) throw new DomainError('Créer un compte associé à un profil professeur.');
        if (user.role === 'ADMIN' && !user.disabled && (role !== 'ADMIN' || state === 'DISABLED') && await tx.user.count({where:{role:'ADMIN',disabled:false}}) <= 1) throw new DomainError('Le dernier administrateur actif doit être conservé.');
        result = await tx.user.update({where:{id},data:{role,disabled:state === 'DISABLED',sessionVersion:{increment:1},...(passwordHash ? {passwordHash} : {})}}); break;
      }
      case 'subject': result = await tx.subject.create({ data: schemas.subject.parse(input) }); break;
      case 'level': result = await tx.level.create({ data: schemas.level.parse(input) }); break;
      case 'room': result = await tx.room.create({ data: schemas.room.parse(input) }); break;
      case 'group': {
        const data = schemas.group.parse(input);
        const teacher = await tx.teacher.findUniqueOrThrow({ where: { id: data.teacherId } });
        if (teacher.archived) throw new DomainError('Professeur archivé.');
        result = await tx.group.create({ data }); break;
      }
      case 'enrollment': {
        const { subscribe, ...data } = schemas.enrollment.parse(input);
        const group = await tx.group.findUniqueOrThrow({ where: { id: data.groupId } });
        const student = await tx.student.findUniqueOrThrow({ where: { id: data.studentId } });
        if (group.archived || student.archived) throw new DomainError('Élève ou groupe archivé.');
        const active = await tx.enrollment.findMany({ where: { groupId: group.id, OR: [{ endsOn: null }, { endsOn: { gte: data.startsOn } }] } });
        if (active.some(e => e.studentId === student.id)) throw new DomainError('Inscription déjà active dans ce groupe.', 409);
        // Count starts and ends at every boundary to enforce capacity over the full open interval.
        const boundaries = [data.startsOn, ...active.filter(e => e.startsOn > data.startsOn).map(e => e.startsOn)];
        if (boundaries.some(day => active.filter(e => e.startsOn <= day && (!e.endsOn || e.endsOn >= day)).length >= group.capacity)) throw new DomainError('Capacité du groupe atteinte.', 409);
        result = await tx.enrollment.create({ data: { ...data, ...(subscribe ? { subscription: { create: { agreedAmount: group.monthlyPrice } } } : {}) } }); break;
      }
      case 'endEnrollment': {
        const data = schemas.endEnrollment.parse(input);
        const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: data.id }, include: { subscription: { include: { charges: true } } } });
        if (data.endsOn < enrollment.startsOn) throw new DomainError('La fin précède le début.');
        const endPeriod = data.endsOn.toISOString().slice(0,7);
        if (enrollment.subscription?.charges.some(c => c.period > endPeriod)) throw new DomainError('Des mensualités postérieures sont déjà émises. Clôture rétroactive refusée.');
        result = await tx.enrollment.update({ where: { id: data.id }, data: { endsOn: data.endsOn } }); break;
      }
      case 'session': {
        const data = schemas.session.parse(input);
        const group = await tx.group.findUniqueOrThrow({ where: { id: data.groupId }, include: { teacher: true } });
        const room = await tx.room.findUniqueOrThrow({ where: { id: data.roomId } });
        if (group.archived || group.teacher.archived) throw new DomainError('Groupe ou professeur archivé.');
        if (room.capacity < group.capacity) throw new DomainError('La salle est trop petite pour la capacité du groupe.');
        const series = randomUUID();
        let last: { id: string } | null = null;
        for (let week = 0; week < data.weeks; week++) {
          const startsAt = new Date(new Date(data.startsAt).getTime() + week * 7 * 86400_000);
          const endsAt = new Date(new Date(data.endsAt).getTime() + week * 7 * 86400_000);
          const conflict = await tx.classSession.findFirst({ where: { status: { not: 'CANCELLED' }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, OR: [{ roomId: data.roomId }, { teacherId: group.teacherId }, { groupId: group.id }] } });
          if (conflict) throw new DomainError('Conflit de salle, de professeur ou de groupe.', 409);
          last = await tx.classSession.create({ data: { groupId: group.id, teacherId: group.teacherId, roomId: data.roomId, startsAt, endsAt, recurrenceKey: `${series}:${week}` } });
        }
        result = last!; break;
      }
      case 'cancelSession': {
        const data = schemas.cancelSession.parse(input);
        result = await tx.classSession.update({ where: { id: data.id }, data: { status: 'CANCELLED', cancellationReason: data.reason } }); break;
      }
      case 'attendance': {
        const data = schemas.attendance.parse(input);
        const session = await tx.classSession.findUniqueOrThrow({ where: { id: data.sessionId } });
        teacherScope(actor, session.teacherId);
        if (session.status === 'CANCELLED' || session.startsAt > new Date()) throw new DomainError('La séance est annulée ou n’a pas encore commencé.');
        const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: data.enrollmentId } });
        const sessionDate = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(session.startsAt)}T00:00:00Z`);
        if (enrollment.groupId !== session.groupId || enrollment.startsOn > sessionDate || (enrollment.endsOn && enrollment.endsOn < sessionDate)) throw new DomainError('Inscription inactive à la date de séance.');
        result = await tx.attendance.upsert({ where: { sessionId_enrollmentId: { sessionId: data.sessionId, enrollmentId: data.enrollmentId } }, create: { ...data, recordedById: actor.id }, update: { status: data.status, comment: data.comment, recordedById: actor.id } }); break;
      }
      case 'archive': {
        const data = schemas.archive.parse(input);
        if (data.kind === 'student') result = await tx.student.update({ where: { id: data.id }, data: { archived: true } });
        else if (data.kind === 'teacher') result = await tx.teacher.update({ where: { id: data.id }, data: { archived: true } });
        else result = await tx.group.update({ where: { id: data.id }, data: { archived: true } });
        break;
      }
      case 'price': {
        const data = schemas.price.parse(input);
        result = await tx.group.update({ where: { id: data.id }, data: { monthlyPrice: data.monthlyPrice } }); break;
      }
      case 'user': {
        admin(actor);
        const { teacherId, password: _password, ...data } = schemas.user.parse(input);
        void _password;
        if (teacherId) {
          const teacher = await tx.teacher.findUniqueOrThrow({where:{id:teacherId}});
          if (teacher.userId) throw new DomainError('Ce professeur possède déjà un compte.');
        }
        result = await tx.user.create({ data: { ...data, passwordHash: passwordHash!, ...(teacherId ? { teacher: { connect: { id: teacherId } } } : {}) } }); break;
      }
      default: throw new DomainError('Action inconnue.');
    }
    await audit(tx, actor.id, action.toUpperCase(), result.id);
    return { id: result.id };
  });
}
