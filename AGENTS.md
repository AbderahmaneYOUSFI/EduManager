# EduManager

Respecter le cahier des charges autonome du 28 octobre 2026. Les anciennes demandes de validation dans docs/phase-1 sont historiques et remplacées par cette instruction.

Utiliser les guides pertinents dans .agents/skills. Documenter les hypothèses dans DECISIONS.md et les vérifications effectivement exécutées dans PROGRESS.md. TypeScript strict ; validation Zod aux entrées ; permissions et périmètre professeur côté serveur. Recharger le rôle en base pour chaque requête.

Finance : Decimal, DZD, mois civil entier, échéance le 10, tarifs historiques, unicité abonnement/mois, transactions sérialisables avec reprise bornée. Ne jamais supprimer les paiements validés ; annulation motivée, audit append-only. Aucun montant fourni par le navigateur ne fait autorité sur les soldes.

N'utiliser que des personnes fictives pour la démonstration. Aucun déploiement en production, paiement réel, secret suivi ou modification des données de production. Les tests doivent passer avant de déclarer la fonctionnalité vérifiée. Ne pas désactiver les assertions pour passer les contrôles.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
