import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { currentActor } from '@/lib/auth';
import { DomainError } from '@/lib/domain';
import { mutate } from '@/modules/school';
import { schemas, type Mutation } from '@/modules/schemas';
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const origin = request.headers.get('origin');
    const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
    if (origin !== expected) throw new DomainError('Origine non autorisée.', 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new DomainError('JSON requis.', 415);
    const actor = await currentActor();
    const { action } = await context.params;
    if (!Object.hasOwn(schemas, action)) throw new DomainError('Action inconnue.', 404);
    const text = await request.text();
    if (text.length > 32768) throw new DomainError('Requête trop volumineuse.', 413);
    const result = await mutate(actor, action as Mutation, JSON.parse(text));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · ') }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 'P2002') return NextResponse.json({ error: 'Cette valeur existe déjà.' }, { status: 409 });
    if (code === 'P2025' || code === 'P2003') return NextResponse.json({ error: 'Référence absente ou invalide.' }, { status: 400 });
    console.error('Mutation failed', { code: typeof code === 'string' ? code : 'INTERNAL' });
    return NextResponse.json({ error: 'Opération indisponible. Réessayez ultérieurement.' }, { status: 500 });
  }
}
