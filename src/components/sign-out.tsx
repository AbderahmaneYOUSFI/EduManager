'use client';
import { signOut } from 'next-auth/react';
export function SignOut() { return <button className="sign-out" onClick={() => signOut({ callbackUrl: '/connexion' })}>Se déconnecter ↗</button>; }
