import { z } from 'zod';
import { dateInput, idInput, moneyInput, periodInput } from '@/lib/domain';
const name = z.string().trim().min(2).max(100);
const optionalText = z.string().trim().max(100).optional();
export const schemas = {
  student: z.object({ firstName: name, lastName: name, phone: optionalText, birthDate: dateInput.optional(), guardianName: name.optional(), guardianPhone: z.string().trim().min(5).max(30).optional(), relationship: optionalText }).refine(v => !v.guardianName || !!v.guardianPhone, 'Téléphone du responsable requis.'),
  guardian: z.object({ studentId: idInput, name, phone: z.string().min(5).max(30), relationship: name }),
  teacher: z.object({ name, email: z.email().optional(), phone: optionalText }),
  updateStudent: z.object({ id: idInput, firstName: name, lastName: name, phone: optionalText }),
  updateTeacher: z.object({ id: idInput, name, email: z.email().optional(), phone: optionalText }),
  updateUser: z.object({ id: idInput, role: z.enum(['ADMIN','SECRETAIRE','PROFESSEUR']), state: z.enum(['ACTIVE','DISABLED']), password: z.string().min(12).max(128).optional() }),
  subject: z.object({ name }), level: z.object({ name }), room: z.object({ name, capacity: z.coerce.number().int().min(1).max(500) }),
  group: z.object({ name, subjectId: idInput, levelId: idInput, teacherId: idInput, capacity: z.coerce.number().int().min(1).max(500), monthlyPrice: moneyInput }),
  enrollment: z.object({ studentId: idInput, groupId: idInput, startsOn: dateInput, subscribe: z.boolean().default(true) }),
  endEnrollment: z.object({ id: idInput, endsOn: dateInput }),
  generate: z.object({ period: periodInput }),
  payment: z.object({ studentId: idInput, amount: moneyInput, method: z.enum(['CASH','TRANSFER','CHEQUE']), idempotencyKey: z.uuid() }),
  cancelPayment: z.object({ id: idInput, reason: z.string().trim().min(5).max(500) }),
  session: z.object({ groupId: idInput, roomId: idInput, startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), weeks: z.coerce.number().int().min(1).max(52).default(1) }).refine(v => new Date(v.endsAt) > new Date(v.startsAt), 'La fin doit suivre le début.').refine(v => new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime() <= 12 * 3600_000, 'Durée maximale : 12 heures.'),
  cancelSession: z.object({ id: idInput, reason: z.string().trim().min(5).max(500) }),
  attendance: z.object({ sessionId: idInput, enrollmentId: idInput, status: z.enum(['PRESENT','ABSENT','LATE','EXCUSED']), comment: z.string().trim().max(500).optional() }),
  archive: z.object({ kind: z.enum(['student','teacher','group']), id: idInput }),
  price: z.object({ id: idInput, monthlyPrice: moneyInput }),
  user: z.object({ name, email: z.email().transform(v => v.toLowerCase()), password: z.string().min(12).max(128), role: z.enum(['ADMIN','SECRETAIRE','PROFESSEUR']), teacherId: idInput.optional() }).refine(v => v.role !== 'PROFESSEUR' || !!v.teacherId, 'Associer le compte à un professeur.'),
};
export type Mutation = keyof typeof schemas;
