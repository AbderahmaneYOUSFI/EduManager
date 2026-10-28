import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { z } from 'zod';
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const email = z.email().parse(process.env.ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(12).max(128).parse(process.env.ADMIN_PASSWORD);
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) throw new Error('NEXTAUTH_SECRET de 32 caractères minimum requis.');
  const admin = await db.user.upsert({ where: { email }, update: {}, create: { email, passwordHash: await hash(password,12), name:'Administration', role:'ADMIN' } });
  console.log('Compte administrateur initialisé (compte existant conservé).');
  if (process.env.SEED_DEMO !== 'true') return;
  await db.$transaction(async tx => {
    if (await tx.student.findUnique({ where: { code:'DEMO-001' } })) return;
    const subject = await tx.subject.upsert({ where:{name:'Mathématiques'},update:{},create:{name:'Mathématiques'} });
    const level = await tx.level.upsert({ where:{name:'3e année secondaire'},update:{},create:{name:'3e année secondaire'} });
    const room = await tx.room.upsert({ where:{name:'Salle A'},update:{},create:{name:'Salle A',capacity:24} });
    const teacher = await tx.teacher.upsert({where:{email:'professeur@example.test'},update:{},create:{name:'Professeur Démonstration',email:'professeur@example.test'}});
    const group = await tx.group.upsert({where:{name:'Maths · Terminale A'},update:{},create:{name:'Maths · Terminale A',subjectId:subject.id,levelId:level.id,teacherId:teacher.id,capacity:20,monthlyPrice:'4500.00'}});
    const now = new Date(); const startsOn = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
    for (let i=1;i<=4;i++) {
      const student = await tx.student.create({data:{code:`DEMO-00${i}`,firstName:['Élève Alpha','Élève Bêta','Élève Gamma','Élève Delta'][i-1],lastName:'Fictif',guardians:{create:{name:`Responsable fictif ${i}`,phone:'0000000000',relationship:'Parent'}}}});
      await tx.enrollment.create({data:{studentId:student.id,groupId:group.id,startsOn,subscription:{create:{agreedAmount:'4500.00'}}}});
    }
    for (let i=-2;i<=3;i++) {
      const startsAt = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+i*7,14));
      await tx.classSession.create({data:{groupId:group.id,teacherId:teacher.id,roomId:room.id,startsAt,endsAt:new Date(startsAt.getTime()+90*60000),recurrenceKey:`DEMO:${startsAt.toISOString()}`}});
    }
    await tx.auditLog.create({data:{actorId:admin.id,action:'DEMO_INITIALIZED',entityId:'DEMO',details:{fictional:true}}});
  });
  console.log('Données fictives initialisées. Générer les mensualités depuis l’interface.');
}
main().catch(() => { console.error('Initialisation impossible. Vérifier base, migrations et variables ADMIN_EMAIL, ADMIN_PASSWORD, NEXTAUTH_SECRET.'); process.exitCode=1; }).finally(() => db.$disconnect());
