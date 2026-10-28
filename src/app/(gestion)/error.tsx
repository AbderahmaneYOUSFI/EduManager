'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="panel"><h1>Espace temporairement indisponible</h1><p>Vérifiez que PostgreSQL est démarré et que les migrations ont été appliquées. Votre compte doit disposer des accès nécessaires.</p><button className="button button-primary" onClick={reset}>Réessayer</button></section>; }
