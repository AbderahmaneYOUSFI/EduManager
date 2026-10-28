import { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { db } from './db';
import { DomainError, type Actor } from './domain';
import { z } from 'zod';
const credentialsSchema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 3600 },
  pages: { signIn: '/connexion' },
  providers: [Credentials({ name: 'EduManager', credentials: { email: { label: 'Adresse e-mail', type: 'email' }, password: { label: 'Mot de passe', type: 'password' } },
    async authorize(input) {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const key = createHash('sha256').update(email).digest('hex');
      const attempt = await db.loginAttempt.upsert({ where: { key }, create: { key, attempts: 1 }, update: { attempts: { increment: 1 } } });
      if (Date.now() - attempt.windowStart.getTime() > 15 * 60_000) {
        await db.loginAttempt.updateMany({ where: { key, windowStart: attempt.windowStart }, data: { attempts: 1, windowStart: new Date() } });
      } else if (attempt.attempts > 10) return null;
      const user = await db.user.findUnique({ where: { email } });
      // Constant-cost comparison even when the account does not exist.
      const valid = await compare(password, user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
      if (!valid || !user || user.disabled) return null;
      await db.loginAttempt.deleteMany({ where: { key } });
      return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
    } })],
  callbacks: { async jwt({ token, user }) { if (user) { token.sub = user.id; token.sessionVersion = user.sessionVersion; } return token; }, async session({ session, token }) { if (session.user && token.sub) { session.user.id = token.sub; session.user.sessionVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : -1; } return session; } },
};
export async function currentActor(): Promise<Actor> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new DomainError('Connexion requise.', 401);
  const user = await db.user.findUnique({ where: { id: session.user.id }, include: { teacher: true } });
  if (!user || user.disabled || user.sessionVersion !== session.user.sessionVersion) throw new DomainError('Session expirée ou compte désactivé.', 401);
  return { id: user.id, role: user.role, teacherId: user.teacher?.id ?? null, name: user.name };
}
