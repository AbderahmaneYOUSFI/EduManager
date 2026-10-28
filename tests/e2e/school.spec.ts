import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('connexion, inscription, mensualité, paiement, reçu et annulation',async ({page}) => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('E2E requiert ADMIN_EMAIL et ADMIN_PASSWORD initialisés sur une base de test.');
  await page.goto('/dashboard'); await expect(page).toHaveURL(/connexion/);
  await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL); await page.getByLabel('Mot de passe').fill(process.env.ADMIN_PASSWORD); await page.getByRole('button',{name:'Se connecter'}).click(); await expect(page.getByRole('heading',{name:'Vue d’ensemble.'})).toBeVisible();
  const suffix = Date.now().toString();
  await page.goto('/matieres');
  async function submit(title:string,values:Record<string,string>,button='Enregistrer') { const details=page.locator('details').filter({has:page.locator('summary',{hasText:title})}); await details.locator('summary').click(); for(const [label,value] of Object.entries(values)){ const input=details.getByLabel(new RegExp(`^${label}`)); if(await input.evaluate(el=>el.tagName)==='SELECT') await input.selectOption({label:value}); else await input.fill(value); } await details.getByRole('button',{name:button,exact:true}).click(); await expect(details.getByRole('status')).toContainText(/effectué|créée/); }
  await submit('Ajouter une matière',{'Matière':`Maths ${suffix}`}); await submit('Ajouter un niveau',{'Niveau':`Niveau ${suffix}`}); await submit('Ajouter une salle',{'Nom de la salle':`Salle ${suffix}`,'Capacité':'20'});
  await page.goto('/professeurs'); await submit('Ajouter un professeur',{'Nom complet':`Prof ${suffix}`});
  await page.goto('/eleves'); await submit('Ajouter un élève',{'Prénom':`Élève ${suffix}`,'Nom':'Test'});
  await page.goto('/groupes'); await submit('Créer un groupe',{'Nom du groupe':`Groupe ${suffix}`,'Matière':`Maths ${suffix}`,'Niveau':`Niveau ${suffix}`,'Professeur':`Prof ${suffix}`,'Capacité':'15','Tarif mensuel':'4500'});
  const studentLabel=await page.locator('details').filter({hasText:'Inscrire un élève dans un groupe'}).locator('select[name=studentId] option').filter({hasText:`Élève ${suffix} Test`}).textContent();
  const period=new Date().toISOString().slice(0,7);
  await submit('Inscrire un élève dans un groupe',{'Élève':studentLabel!,'Groupe':`Groupe ${suffix}`,'Date de début':`${period}-01`,'Abonnement mensuel':'Oui · tarif du groupe'});
  await page.goto('/abonnements'); await submit('Générer les mensualités',{'Mois civil':period},'Générer les mensualités'); await expect(page.getByRole('row').filter({hasText:`Élève ${suffix}`})).toContainText('4');
  await page.goto('/paiements'); await submit('Enregistrer un encaissement',{'Élève':studentLabel!,'Montant':'1500','Mode de paiement':'Espèces'},'Valider l’encaissement');
  const row=page.getByRole('row').filter({hasText:`Élève ${suffix}`}); await expect(row).toContainText('Validé'); const receiptUrl=await row.getByRole('link',{name:'Télécharger PDF'}).getAttribute('href'); const response=await page.request.get(receiptUrl!); expect(response.headers()['content-type']).toBe('application/pdf'); expect((await response.body()).subarray(0,4).toString()).toBe('%PDF');
  const paymentLabel=await page.locator('select[name=id] option').filter({hasText:`Élève ${suffix}`}).textContent(); await submit('Annuler un paiement',{'Paiement':paymentLabel!,'Motif':'Annulation de test'},'Annuler le paiement'); await expect(row).toContainText('Annulé');
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  await page.goto('/planning'); await submit('Planifier un cours',{'Groupe':`Groupe ${suffix}`,'Salle':`Salle ${suffix}`,'Début':`${yesterday}T10:00`,'Fin':`${yesterday}T11:00`,'Nombre de semaines':'1'});
  await page.goto('/presences'); const sessionLabel=await page.locator('select[name=sessionId] option').filter({hasText:`Groupe ${suffix}`}).textContent(); const enrollmentLabel=await page.locator('select[name=enrollmentId] option').filter({hasText:`Élève ${suffix}`}).textContent();
  await submit('Relever ou corriger',{'Séance':sessionLabel!,'Inscription':enrollmentLabel!,'Statut':'Présent'}); await expect(page.getByRole('row').filter({hasText:`Élève ${suffix}`})).toContainText('Présent');
  await page.goto('/dashboard'); await mkdir('.local/screenshots',{recursive:true}); await page.screenshot({path:'.local/screenshots/dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'.local/screenshots/dashboard-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
