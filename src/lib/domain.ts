import Decimal from 'decimal.js';
import { z } from 'zod';
export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type Actor = { id: string; role: 'ADMIN' | 'SECRETAIRE' | 'PROFESSEUR'; teacherId: string | null; name: string };
export function staff(actor: Actor) { if (actor.role === 'PROFESSEUR') throw new DomainError('Accès réservé au personnel administratif.', 403); }
export function admin(actor: Actor) { if (actor.role !== 'ADMIN') throw new DomainError('Accès réservé à la direction.', 403); }
export function teacherScope(actor: Actor, teacherId: string) {
  if (actor.role === 'PROFESSEUR' && actor.teacherId !== teacherId) throw new DomainError('Ce groupe ne vous est pas attribué.', 403);
}
export const moneyInput = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Montant positif avec au plus deux décimales.').refine(v => new Decimal(v).gt(0), 'Montant supérieur à zéro requis.');
export const periodInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v => Number(v.slice(0,4)) >= 2000 && Number(v.slice(0,4)) <= 2100);
export const dateInput = z.iso.date().transform(v => new Date(`${v}T00:00:00.000Z`));
export const idInput = z.uuid();
export function monthBounds(period: string) {
  periodInput.parse(period);
  const [year, month] = period.split('-').map(Number);
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)), due: new Date(Date.UTC(year, month - 1, 10)) };
}
export function activeInPeriod(startsOn: Date, endsOn: Date | null, period: string) {
  const { start, end } = monthBounds(period);
  return startsOn < end && (!endsOn || endsOn >= start);
}
export function balance(amount: Decimal.Value, allocations: Decimal.Value[]) {
  return allocations.reduce<Decimal>((total, item) => total.minus(item), new Decimal(amount));
}
export function allocate(amount: string, charges: { id: string; remaining: string }[]) {
  let rest = new Decimal(amount);
  if (!rest.isFinite() || rest.lte(0)) throw new DomainError('Montant invalide.');
  const allocations: { chargeId: string; amount: string }[] = [];
  for (const charge of charges) {
    const remaining = new Decimal(charge.remaining);
    if (remaining.lt(0)) throw new DomainError('Solde incohérent.');
    const part = Decimal.min(rest, remaining);
    if (part.gt(0)) allocations.push({ chargeId: charge.id, amount: part.toFixed(2) });
    rest = rest.minus(part);
  }
  if (rest.gt(0)) throw new DomainError('Le paiement dépasse les mensualités disponibles. Émettre les mensualités futures avant un paiement anticipé.');
  return allocations;
}
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && aEnd > bStart; }
export const formatMoney = (value: string | number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(Number(value));
