import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { allocate, balance, monthBounds, staff, admin, DomainError, type Actor } from '@/lib/domain';
import { audit, serializable } from '@/lib/transaction';
import { schemas } from './schemas';

export async function generateCharges(actor: Actor, input: unknown) {
  staff(actor);
  const { period } = schemas.generate.parse(input);
  const { start, end, due } = monthBounds(period);
  return serializable(async tx => {
    const subscriptions = await tx.subscription.findMany({ where: { enrollment: { startsOn: { lt: end }, OR: [{ endsOn: null }, { endsOn: { gte: start } }] } } });
    let created = 0;
    for (const subscription of subscriptions) {
      const existing = await tx.monthlyCharge.findUnique({ where: { subscriptionId_period: { subscriptionId: subscription.id, period } } });
      if (!existing) {
        await tx.monthlyCharge.create({ data: { subscriptionId: subscription.id, period, amount: subscription.agreedAmount, dueOn: due } });
        created++;
      }
    }
    await audit(tx, actor.id, 'CHARGES_GENERATED', period, { created });
    return { created };
  });
}
export async function collectPayment(actor: Actor, input: unknown) {
  staff(actor);
  const data = schemas.payment.parse(input);
  const requestHash = createHash('sha256').update(JSON.stringify({ studentId: data.studentId, amount: data.amount, method: data.method })).digest('hex');
  return serializable(async tx => {
    const existing = await tx.payment.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new DomainError('Cette clé a déjà été utilisée pour un autre paiement.', 409);
      return existing;
    }
    const student = await tx.student.findUniqueOrThrow({ where: { id: data.studentId } });
    const charges = await tx.monthlyCharge.findMany({ where: { subscription: { enrollment: { studentId: data.studentId } } }, include: { allocations: { where: { payment: { status: 'VALIDATED' } } } }, orderBy: [{ dueOn: 'asc' }, { id: 'asc' }] });
    const allocations = allocate(data.amount, charges.map(c => ({ id: c.id, remaining: balance(c.amount.toString(), c.allocations.map(a => a.amount.toString())).toFixed(2) })));
    const payment = await tx.payment.create({ data: { ...data, requestHash, collectedById: actor.id, receiptNumber: `EDU-${new Date().getUTCFullYear()}-${randomUUID()}`, schoolSnapshot: process.env.SCHOOL_NAME || 'EduManager', studentSnapshot: `${student.code} — ${student.firstName} ${student.lastName}`, allocations: { create: allocations } } });
    await audit(tx, actor.id, 'PAYMENT_VALIDATED', payment.id, { amount: data.amount, allocationCount: allocations.length });
    return payment;
  });
}
export async function cancelPayment(actor: Actor, input: unknown) {
  admin(actor);
  const data = schemas.cancelPayment.parse(input);
  return serializable(async tx => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: data.id } });
    if (payment.status === 'CANCELLED') return payment;
    const result = await tx.payment.update({ where: { id: data.id }, data: { status: 'CANCELLED', cancelledById: actor.id, cancelledAt: new Date(), cancelReason: data.reason } });
    await audit(tx, actor.id, 'PAYMENT_CANCELLED', payment.id, { reason: data.reason });
    return result;
  });
}
export async function chargeLedger() {
  const charges = await db.monthlyCharge.findMany({ include: { subscription: { include: { enrollment: { include: { student: true, group: true } } } }, allocations: { where: { payment: { status: 'VALIDATED' } } } }, orderBy: [{ dueOn: 'asc' }, { id: 'asc' }] });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return charges.map(c => {
    const remaining = balance(c.amount.toString(), c.allocations.map(a => a.amount.toString()));
    return { id: c.id, studentId: c.subscription.enrollment.studentId, student: `${c.subscription.enrollment.student.firstName} ${c.subscription.enrollment.student.lastName}`, group: c.subscription.enrollment.group.name, period: c.period, amount: c.amount.toFixed(2), remaining: remaining.toFixed(2), dueOn: c.dueOn.toISOString().slice(0,10), overdue: remaining.gt(0) && c.dueOn.toISOString().slice(0,10) < today };
  });
}
