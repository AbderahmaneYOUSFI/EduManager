import { test,expect } from '@playwright/test';
import { randomBytes,randomUUID } from 'node:crypto';
test('contrôles serveur, périmètre professeur et révocation de session',async({page,browser})=>{
  const denied=await page.request.post('/api/manage/student',{headers:{origin:'http://localhost:3100'},data:{firstName:'Test',lastName:'Test'}});expect(denied.status()).toBe(401);
  await page.goto('/connexion');await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL!);await page.getByLabel('Mot de passe').fill(process.env.ADMIN_PASSWORD!);await page.getByRole('button',{name:'Se connecter'}).click();await expect(page).toHaveURL(/dashboard/);
  const csrf=await page.request.post('/api/manage/subject',{headers:{origin:'https://foreign.invalid'},data:{name:'Intrusion'}});expect(csrf.status()).toBe(403);
  async function create(action:string,data:unknown){const response=await page.request.post(`/api/manage/${action}`,{headers:{origin:'http://localhost:3100'},data});expect(response.ok(),await response.text()).toBe(true);return await response.json() as {id:string};}
  const suffix=Date.now();const teacher=await create('teacher',{name:`Prof autorisé ${suffix}`});const other=await create('teacher',{name:`Autre prof ${suffix}`});
  const subject=await create('subject',{name:`Sujet sécurité ${suffix}`});const level=await create('level',{name:`Niveau sécurité ${suffix}`});
  await create('group',{name:`Groupe autorisé ${suffix}`,teacherId:teacher.id,subjectId:subject.id,levelId:level.id,capacity:10,monthlyPrice:'5000'});
  await create('group',{name:`Groupe privé ${suffix}`,teacherId:other.id,subjectId:subject.id,levelId:level.id,capacity:10,monthlyPrice:'6000'});
  const email=`teacher-${suffix}@example.test`,password=randomBytes(20).toString('hex');
  const user=await create('user',{name:'Compte professeur',email,password,role:'PROFESSEUR',teacherId:teacher.id});
  const context=await browser.newContext();const professor=await context.newPage();
  await professor.goto('http://localhost:3100/connexion');await professor.getByLabel('Adresse e-mail').fill(email);await professor.getByLabel('Mot de passe').fill(password);await professor.getByRole('button',{name:'Se connecter'}).click();await expect(professor).toHaveURL(/dashboard/);
  await professor.goto('http://localhost:3100/groupes');await expect(professor.getByRole('table').first()).toContainText(`Groupe autorisé ${suffix}`);await expect(professor.locator('main')).not.toContainText(`Groupe privé ${suffix}`);await expect(professor.getByRole('columnheader',{name:'Tarif mensuel'})).toHaveCount(0);
  await professor.goto('http://localhost:3100/paiements');await expect(professor.getByRole('heading',{name:'Accès réservé'})).toBeVisible();
  const mutation=await professor.request.post('/api/manage/generate',{headers:{origin:'http://localhost:3100'},data:{period:'2026-10'}});expect(mutation.status()).toBe(403);
  const receipt=await professor.request.get(`/api/receipts/${randomUUID()}`);expect(receipt.status()).toBe(403);
  await create('updateUser',{id:user.id,role:'PROFESSEUR',state:'DISABLED'});
  const revoked=await professor.request.post('/api/manage/attendance',{headers:{origin:'http://localhost:3100'},data:{}});expect(revoked.status()).toBe(401);
  await context.close();
});
