import { Prisma } from '@/generated/prisma/client';
import { db } from './db';
export async function serializable<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(run, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }); }
    catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (attempt >= 3 || (code !== 'P2034' && code !== 'P2002')) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
export async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityId: string, details: Prisma.InputJsonValue = {}) {
  await tx.auditLog.create({ data: { actorId, action, entityId, details } });
}
