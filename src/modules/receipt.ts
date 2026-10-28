import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
type Receipt = { receiptNumber: string; schoolSnapshot: string; studentSnapshot: string; amount: string; paidAt: Date; method: string; status: string; cancelReason: string | null; allocations: { period: string; group: string; amount: string }[] };
// Standard PDF fonts cover French/Latin; transliterate unsupported glyphs rather than fail the download.
const latin = (text: string) => text.replace(/[^\u0020-\u00ff\u2013\u2014\u2019]/g, '?');
export async function renderReceipt(receipt: Receipt) {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28,841.89]); let y = 780;
  const line = (text: string, size = 11, strong = false) => {
    if (y < 60) { page = pdf.addPage([595.28,841.89]); y = 780; }
    const max = 90; const chunks = text.match(new RegExp(`.{1,${max}}`, 'g')) || [''];
    for (const chunk of chunks) { page.drawText(latin(chunk), { x:48, y, size, font:strong ? bold : font, color:rgb(.12,.25,.2) }); y -= size + 12; }
  };
  line(receipt.schoolSnapshot,22,true); line('REÇU DE PAIEMENT',15,true); line(receipt.receiptNumber,9); y -= 20;
  line(`Élève : ${receipt.studentSnapshot}`);
  line(`Date : ${new Intl.DateTimeFormat('fr-DZ',{dateStyle:'long',timeZone:'Africa/Algiers'}).format(receipt.paidAt)}`);
  line(`Mode : ${{CASH:'Espèces',TRANSFER:'Virement',CHEQUE:'Chèque'}[receipt.method] || receipt.method}`);
  line(`Montant : ${receipt.amount} DZD`,16,true); y -= 20;
  line('Ventilation des mensualités',12,true);
  for (const allocation of receipt.allocations) line(`${allocation.period}  |  ${allocation.group}  |  ${allocation.amount} DZD`);
  y -= 20; line(receipt.status === 'CANCELLED' ? `ANNULÉ : ${receipt.cancelReason}` : 'Paiement validé et enregistré.',12,true);
  line('Document de gestion interne. Conserver ce reçu.',9);
  pdf.setTitle(`Reçu ${receipt.receiptNumber}`); return pdf.save();
}
