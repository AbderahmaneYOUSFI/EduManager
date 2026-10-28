'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  return <div style={{ width: '100%', height: 260 }}><ResponsiveContainer><BarChart data={data}><CartesianGrid vertical={false} stroke="#e7edf3" /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={65} /><Tooltip formatter={value => `${value} DZD`} /><Bar dataKey="amount" name="Encaissements" fill="#187b66" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>;
}
