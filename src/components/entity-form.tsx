'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
export type Field = { name: string; label: string; type?: string; required?: boolean; options?: { id: string; label: string }[]; value?: string; min?: string; step?: string };
export function EntityForm({ action, title, fields, submitLabel = 'Enregistrer' }: { action: string; title: string; fields: Field[]; submitLabel?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Record<string, string>>();
  const [paymentKey, setPaymentKey] = useState<string | null>(null);
  async function onSubmit(values: Record<string, string>) {
    setMessage(''); setSuccess(false);
    const data: Record<string, unknown> = Object.fromEntries(Object.entries(values).filter(([,v]) => v !== ''));
    if (action === 'enrollment') data.subscribe = values.subscribe !== 'false';
    if (action === 'session') for (const key of ['startsAt', 'endsAt']) data[key] = `${values[key]}:00+01:00`;
    if (action === 'payment') { const key = paymentKey || crypto.randomUUID(); setPaymentKey(key); data.idempotencyKey = key; }
    try {
      const response = await fetch(`/api/manage/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || 'Échec de l’opération.'); return; }
      setMessage(typeof result.created === 'number' ? `${result.created} mensualité(s) créée(s).` : 'Enregistrement effectué.'); setSuccess(true);
      setPaymentKey(null); reset(); router.refresh();
    } catch { setMessage('Connexion interrompue. Vous pouvez réessayer.'); }
  }
  return <details className="form-panel"><summary>{title}<span>+</span></summary><form onSubmit={handleSubmit(onSubmit)}>
    <div className="form-grid">{fields.map(field => <label key={field.name}>{field.label}{field.required !== false && <span className="required"> *</span>}
      {field.options ? <select {...register(field.name, { required: field.required !== false })} defaultValue={field.value ?? ''}><option value="">Choisir…</option>{field.options.map(o => <option value={o.id} key={o.id}>{o.label}</option>)}</select> : <input {...register(field.name, { required: field.required !== false })} type={field.type || 'text'} defaultValue={field.value} min={field.min} step={field.step} maxLength={field.type === 'password' ? 128 : 500} />}
    </label>)}</div><Button disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : submitLabel}</Button>
    {message && <p role="status" className={success ? 'message-success' : 'message-error'}>{message}</p>}
  </form></details>;
}
