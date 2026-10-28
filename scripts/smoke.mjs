import 'dotenv/config';
import assert from 'node:assert/strict';
const base=process.env.SMOKE_URL || 'http://localhost:3000';
const cookies=new Map();
async function request(path,options={}) {
  const response=await fetch(new URL(path,base),{...options,redirect:'manual',headers:{...options.headers,cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join('; ')}});
  for(const cookie of response.headers.getSetCookie()) { const part=cookie.split(';')[0];const split=part.indexOf('=');cookies.set(part.slice(0,split),part.slice(split+1)); }
  return response;
}
assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD,'Compte local de test requis.');
const csrf=await request('/api/auth/csrf');assert.equal(csrf.status,200);const {csrfToken}=await csrf.json();
await request('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',origin:base},body:new URLSearchParams({csrfToken,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD,json:'true',callbackUrl:`${base}/dashboard`})});
const session=await (await request('/api/auth/session')).json();assert.equal(session.user?.email,process.env.ADMIN_EMAIL);assert.ok(session.user.id);
const dashboard=await request('/dashboard');assert.equal(dashboard.status,200);const html=await dashboard.text();assert.ok(html.includes('Vue d’ensemble'));assert.ok(!html.includes('Espace temporairement indisponible'));
console.log('Smoke réussi : connexion Auth.js, session et dashboard avec PostgreSQL.');
