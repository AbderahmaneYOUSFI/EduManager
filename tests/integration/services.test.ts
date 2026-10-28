import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/lib/db';
import { mutate } from '../../src/modules/school';
import { generateCharges,collectPayment,cancelPayment,chargeLedger } from '../../src/modules/finance';
import type { Actor } from '../../src/lib/domain';
if(process.env.TEST_DATABASE !== 'true' || !new URL(process.env.DATABASE_URL!).pathname.startsWith('/edumanager_test_')) throw new Error('Base de test isolée obligatoire.');
let actor:Actor; let teacherActor:Actor; let studentId:string; let groupId:string; let teacherId:string; let roomId:string; let enrollmentId:string;
const currentMonth = new Date().toISOString().slice(0,7);
const nextMonth = new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth()+1,1)).toISOString().slice(0,7);
beforeAll(async()=>{
  const user=await db.user.create({data:{name:'Test Admin',email:'admin@test.invalid',passwordHash:'unused',role:'ADMIN'}});
  actor={id:user.id,name:user.name,role:user.role,teacherId:null};
  const teacher=await db.teacher.create({data:{name:'Test Teacher'}});teacherId=teacher.id;
  const otherTeacher=await db.teacher.create({data:{name:'Other Teacher'}});
  teacherActor={id:user.id,name:'Teacher',role:'PROFESSEUR',teacherId:otherTeacher.id};
  const subject=await db.subject.create({data:{name:'Maths'}});const level=await db.level.create({data:{name:'Terminale'}});
  const room=await db.room.create({data:{name:'Salle',capacity:20}});roomId=room.id;
  const group=await db.group.create({data:{name:'Groupe',subjectId:subject.id,levelId:level.id,teacherId,capacity:2,monthlyPrice:'4500'}});groupId=group.id;
  const student=await db.student.create({data:{firstName:'Élève',lastName:'Fictif',code:'TEST'}});studentId=student.id;
  const enrollment=await mutate(actor,'enrollment',{studentId,groupId,startsOn:`${currentMonth}-15`,subscribe:true}) as {id:string};enrollmentId=enrollment.id;
});
afterAll(()=>db.$disconnect());
describe('Invariants avec PostgreSQL réel',{concurrent:false},()=>{
  it('interdit une double inscription et les accès professeur administratifs',async()=>{
    await expect(mutate(actor,'enrollment',{studentId,groupId,startsOn:`${currentMonth}-20`})).rejects.toThrow(/déjà active/);
    await expect(generateCharges(teacherActor,{period:currentMonth})).rejects.toThrow(/réservé/);
  });
  it('fige le prix et génère les mensualités une fois sous concurrence',async()=>{
    await mutate(actor,'price',{id:groupId,monthlyPrice:'6000'});
    const results=await Promise.all([generateCharges(actor,{period:currentMonth}),generateCharges(actor,{period:currentMonth})]);
    expect(results.reduce((n,r)=>n+r.created,0)).toBe(1);
    await generateCharges(actor,{period:nextMonth});
    const charges=await db.monthlyCharge.findMany();expect(charges).toHaveLength(2);expect(charges.every(c=>c.amount.toFixed(2)==='4500.00')).toBe(true);
    expect(charges.find(c=>c.period===currentMonth)!.dueOn.getUTCDate()).toBe(10);
  });
  it('ventile, empêche le surpaiement concurrent et respecte l’idempotence',async()=>{
    const key=randomUUID();
    const request={studentId,amount:'6000',method:'CASH',idempotencyKey:key};
    const results=await Promise.allSettled([collectPayment(actor,request),collectPayment(actor,{...request,idempotencyKey:randomUUID()})]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    const payment=await db.payment.findFirstOrThrow();expect(await db.paymentAllocation.count()).toBe(2);
    const retry=await collectPayment(actor,{...request,idempotencyKey:payment.idempotencyKey});expect(retry.id).toBe(payment.id);expect(await db.payment.count()).toBe(1);
    await expect(collectPayment(actor,{...request,amount:'5',idempotencyKey:payment.idempotencyKey})).rejects.toThrow(/autre paiement/);
    const ledger=await chargeLedger();expect(ledger.map(c=>c.remaining).sort()).toEqual(['0.00','3000.00']);
  });
  it('protège les écritures et trace l’annulation sans suppression',async()=>{
    const payment=await db.payment.findFirstOrThrow();const charge=await db.monthlyCharge.findFirstOrThrow();
    await expect(db.payment.delete({where:{id:payment.id}})).rejects.toThrow();
    await expect(db.monthlyCharge.update({where:{id:charge.id},data:{amount:'1'}})).rejects.toThrow();
    await expect(db.payment.update({where:{id:payment.id},data:{amount:'1'}})).rejects.toThrow();
    await expect(cancelPayment({...actor,role:'SECRETAIRE'},{id:payment.id,reason:'Test refusé'})).rejects.toThrow();
    await cancelPayment(actor,{id:payment.id,reason:'Erreur de test'});await cancelPayment(actor,{id:payment.id,reason:'Erreur de test'});
    expect((await chargeLedger()).every(c=>c.remaining==='4500.00')).toBe(true);expect(await db.paymentAllocation.count()).toBe(2);
    expect(await db.auditLog.count({where:{action:'PAYMENT_CANCELLED'}})).toBe(1);
    const audit=await db.auditLog.findFirstOrThrow();await expect(db.auditLog.delete({where:{id:audit.id}})).rejects.toThrow();
  });
  it('interdit un paiement déséquilibré même hors service',async()=>{
    await expect(db.payment.create({data:{studentId,amount:'1',method:'CASH',idempotencyKey:randomUUID(),requestHash:'test',receiptNumber:randomUUID(),collectedById:actor.id,schoolSnapshot:'Test',studentSnapshot:'Test'}})).rejects.toThrow();
  });
  it('détecte les conflits de planning et permet une séance adjacente',async()=>{
    const startsAt=`${currentMonth}-20T10:00:00+01:00`;const endsAt=`${currentMonth}-20T11:00:00+01:00`;
    await mutate(actor,'session',{groupId,roomId,startsAt,endsAt,weeks:1});
    await expect(mutate(actor,'session',{groupId,roomId,startsAt,endsAt,weeks:1})).rejects.toThrow(/Conflit/);
    await mutate(actor,'session',{groupId,roomId,startsAt:endsAt,endsAt:`${currentMonth}-20T12:00:00+01:00`,weeks:1});
    expect(await db.classSession.count()).toBe(2);
  });
  it('vérifie le périmètre professeur et l’inscription aux présences',async()=>{
    const session=await db.classSession.create({data:{groupId,roomId,teacherId,startsAt:new Date(Date.now()-3600000),endsAt:new Date(Date.now()-1000)}});
    const request={sessionId:session.id,enrollmentId,status:'ABSENT'};
    await expect(mutate(teacherActor,'attendance',request)).rejects.toThrow(/attribué/);
    await mutate({...teacherActor,teacherId},'attendance',request);
    await mutate({...teacherActor,teacherId},'attendance',{...request,status:'PRESENT'});
    expect(await db.attendance.count()).toBe(1);expect((await db.attendance.findFirstOrThrow()).status).toBe('PRESENT');
    expect((await chargeLedger()).every(c=>c.amount==='4500.00')).toBe(true);
  });
});
