import { describe, it, expect } from 'vitest';
import { activeInPeriod, allocate, balance, monthBounds, overlaps, teacherScope, staff, admin, moneyInput, type Actor } from '../../src/lib/domain';
const day = (v: string) => new Date(`${v}T00:00:00Z`);
describe('Mois civils', () => {
  it('gère février bissextile, décembre et échéance fixe', () => { expect(monthBounds('2028-02').end).toEqual(day('2028-03-01')); expect(monthBounds('2026-12').end).toEqual(day('2027-01-01')); expect(monthBounds('2026-10').due).toEqual(day('2026-10-10')); });
  it('facture un mois commencé même le dernier jour', () => { expect(activeInPeriod(day('2026-10-31'),null,'2026-10')).toBe(true); expect(activeInPeriod(day('2026-11-01'),null,'2026-10')).toBe(false); });
  it('inclut le dernier jour du contrat', () => { expect(activeInPeriod(day('2026-09-01'),day('2026-10-01'),'2026-10')).toBe(true); expect(activeInPeriod(day('2026-09-01'),day('2026-09-30'),'2026-10')).toBe(false); });
  it('rejette les périodes invalides', () => { expect(() => monthBounds('2026-13')).toThrow(); expect(() => monthBounds('2026-00')).toThrow(); });
});
describe('Grand livre Decimal', () => {
  it('calcule sans erreur binaire', () => expect(balance('0.30',['0.10','0.20']).toFixed(2)).toBe('0.00'));
  it('ventile un paiement sur plusieurs mensualités dans l’ordre fourni', () => expect(allocate('6500.25',[{id:'a',remaining:'4500.00'},{id:'b',remaining:'4500.00'}])).toEqual([{chargeId:'a',amount:'4500.00'},{chargeId:'b',amount:'2000.25'}]));
  it('ignore les mensualités déjà soldées', () => expect(allocate('5',[{id:'a',remaining:'0'},{id:'b',remaining:'10'}])).toEqual([{chargeId:'b',amount:'5.00'}]));
  it('rejette surpaiements et montants non positifs', () => { expect(() => allocate('11',[{id:'a',remaining:'10'}])).toThrow(); expect(() => allocate('0',[])).toThrow(); expect(() => allocate('-5',[])).toThrow(); });
  it('valide précision et signe en entrée', () => { expect(moneyInput.safeParse('0.01').success).toBe(true); for (const v of ['0','-1','1.001','1e3','NaN']) expect(moneyInput.safeParse(v).success).toBe(false); });
});
describe('Autorisations et planning', () => {
  const teacher: Actor = {id:'u',role:'PROFESSEUR',teacherId:'t1',name:'Test'};
  it('interdit les données d’un autre professeur', () => { expect(() => teacherScope(teacher,'t1')).not.toThrow(); expect(() => teacherScope(teacher,'t2')).toThrow(); expect(() => staff(teacher)).toThrow(); });
  it('réserve les opérations administratives', () => expect(() => admin({...teacher,role:'SECRETAIRE'})).toThrow());
  it('autorise les séances adjacentes et détecte les recouvrements', () => { expect(overlaps(day('2026-10-01'),day('2026-10-02'),day('2026-10-02'),day('2026-10-03'))).toBe(false); expect(overlaps(day('2026-10-01'),day('2026-10-03'),day('2026-10-02'),day('2026-10-04'))).toBe(true); });
});
