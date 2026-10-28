import { currentActor } from '@/lib/auth';
import { db } from '@/lib/db';
import { DomainError, staff, idInput } from '@/lib/domain';
import { renderReceipt } from '@/modules/receipt';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentActor(); staff(actor);
    const parsed = idInput.safeParse((await context.params).id);
    if (!parsed.success) return new Response('Identifiant invalide.',{status:400});
    const payment = await db.payment.findUnique({ where: { id: parsed.data }, include: { allocations: { include: { charge: { include: { subscription: { include: { enrollment: { include: { group: true } } } } } } } } } });
    if (!payment) return new Response('Reçu introuvable.', { status:404 });
    const bytes = await renderReceipt({ ...payment, amount:payment.amount.toFixed(2), allocations:payment.allocations.map(a => ({ period:a.charge.period, group:a.charge.subscription.enrollment.group.name, amount:a.amount.toFixed(2) })) });
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="${payment.receiptNumber}.pdf"`, 'Cache-Control':'private, no-store' } });
  } catch(error) { if (error instanceof DomainError) return new Response(error.message,{status:error.status}); return new Response('Reçu temporairement indisponible.',{status:500}); }
}
