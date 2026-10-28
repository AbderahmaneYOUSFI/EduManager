'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function NavLink({href,children}:{href:string;children:React.ReactNode}) { const active=usePathname()===href;return <Link href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{children}</Link>; }
