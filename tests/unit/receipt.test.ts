import { it,expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { renderReceipt } from '../../src/modules/receipt';
it('produit un reçu PDF lisible même avec un nom hors alphabet latin',async () => {
  const bytes = await renderReceipt({receiptNumber:'EDU-TEST',schoolSnapshot:'École démo',studentSnapshot:'Élève اختبار',amount:'1234.50',paidAt:new Date(),method:'CASH',status:'CANCELLED',cancelReason:'Erreur de saisie',allocations:[{period:'2026-10',group:'Maths',amount:'1234.50'}]});
  const doc = await PDFDocument.load(bytes); expect(doc.getPageCount()).toBe(1); expect(doc.getTitle()).toBe('Reçu EDU-TEST'); expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28);
});
