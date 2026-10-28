import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) { console.log('.env existe déjà ; aucune modification.'); }
else {
  const password = randomBytes(24).toString('hex');
  writeFileSync('.env', [
    `DATABASE_URL=postgresql://edumanager:${password}@localhost:5432/edumanager`,
    `POSTGRES_PASSWORD=${password}`, 'NEXTAUTH_URL=http://localhost:3000',
    `NEXTAUTH_SECRET=${randomBytes(48).toString('base64url')}`, 'ADMIN_EMAIL=admin@example.test',
    `ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`, 'SEED_DEMO=true', 'SCHOOL_NAME=EduManager', '',
  ].join('\n'), { mode: 0o600 });
  console.log('Environnement local initialisé dans .env, sans affichage des secrets.');
}
