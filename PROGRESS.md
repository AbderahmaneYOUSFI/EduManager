# Avancement — 28 octobre 2026

## Fonctionnalités implémentées

| Phases | Résultat |
| --- | --- |
| 1–2 | Architecture retenue, 13 skills spécialisés, schéma Prisma opérationnel, trois migrations PostgreSQL et contraintes SQL |
| 3 | Auth.js stable, mots de passe bcrypt, rôles direction/secrétariat/professeur, limitation des connexions, révocation des sessions |
| 4 | Navigation responsive, connexion, états vides/erreurs, composants UI Tailwind suivant shadcn/ui |
| 5–6 | Élèves, responsables légaux, modification et archivage des fiches ; professeurs, matières, niveaux et salles |
| 7 | Groupes, capacités, inscriptions multiples, clôture et tarif historique par abonnement |
| 8–9 | Calendrier FullCalendar, séances et séries hebdomadaires, détection de conflits, annulation et présences contrôlées |
| 10 | Génération mensuelle civile idempotente, échéance au 10 et calcul des impayés |
| 11 | Paiements partiels répartis par ancienneté, idempotence, transactions sérialisables, annulations motivées, reçus PDF |
| 12 | Tableau de bord avec effectifs, groupes, montants et retards réels ; graphique Recharts |
| 13 | Tests unitaires, intégration sur PostgreSQL isolé, E2E Chromium et contrôles d’accès |
| 14 | Image Docker multi-stage, Compose PostgreSQL/web/outils, seed sécurisé et documentation d’exploitation |

## Vérifications effectivement exécutées

- Installation npm et génération Prisma 7.10.1 ; Next.js 16.4.3 et React 19.3.1 résolus par le lockfile (référence exacte : package-lock.json).
- Trois migrations appliquées à la base locale ; schéma vierge également migré par les runners d’intégration et E2E.
- Initialisation admin et données fictives exécutée. Aucun mot de passe fourni dans le dépôt ni affiché par les scripts.
- TypeScript strict : succès. ESLint : succès sans avertissement après correction de l’export PostCSS.
- Vitest : 13 tests unitaires réussis (limites de mois, Decimal, ventilation, RBAC, conflits et PDF).
- PostgreSQL : 7 tests d’intégration réussis (tarif conservé, émission concurrente, encaissement concurrent, idempotence, annulation, immutabilité, conflits et présences).
- Playwright Chromium : 2 tests E2E réussis. Parcours création de référentiels → élève → groupe → inscription → mensualité → paiement partiel → reçu PDF → annulation → séance → présence. Second parcours : absence de session, origine hostile, périmètre professeur, refus des finances et révocation de session.
- Contrôle responsive à 390 px et inspection visuelle des captures bureau/mobile. Pas de débordement horizontal détecté. Captures dans .local/screenshots.
- Build Next.js de production local : succès. Images Docker finales web/outils construites avec npm ci (aucune vulnérabilité signalée), web démarré sur localhost:3000 (HTTP 200), PostgreSQL sain, migrations et seed exécutés depuis le conteneur tools. Smoke HTTP authentifié réussi : Auth.js, session et dashboard utilisant PostgreSQL.
- npm audit --audit-level=high : aucune vulnérabilité signalée après mise à jour de Vitest vers 5.0.5, y compris dans les dépendances de développement. Les 13 tests unitaires et 7 tests d’intégration ont été relancés avec succès sous cette version.
- Les 13 SKILL.md passent quick_validate.py (PyYAML local au projet).

## Incidents corrigés

- Archive Rollup annoncée par le registre mais introuvable : version temporairement fixée, puis ancienne dépendance éliminée lors de la migration vers Vitest 5.
- Vitest/esbuild ne peut pas charger sa configuration dans le bac à sable Windows de cette session : tests exécutés avec l’autorisation externe accordée, sans modifier les protections applicatives.
- Le premier E2E distinguait mal Nom et Prénom : sélecteur ancré corrigé, assertions conservées, parcours relancé avec succès.
- Le premier build Docker a détecté un conflit de dépendance AJV d’un résolveur inutilisé : résolveur retiré et lockfile régénéré. La validation serveur Zod et React Hook Form sont conservés.
- Les alertes des anciens outils de test ont été corrigées par mise à jour de Vitest ; déclaration de suite adaptée à sa nouvelle API avec exécution séquentielle explicite et assertions conservées.
- Une relance E2E pendant l’export Docker a rencontré net::ERR_NETWORK_IO_SUSPENDED dans Chromium sur GET /api/auth/providers. Aucun échec applicatif de permissions ni assertion contournée ; relance complète après l’export : **2 tests réussis en 1,7 minute**. Le smoke authentifié de l’image finale a également réussi.

Le workflow GitHub Actions est préparé dans .github/workflows/ci.yml ; il n’a pas été exécuté sur GitHub dans cette session. L’aperçu intégré au client est indisponible (aucun navigateur connecté) ; le contrôle visuel a été effectué sur les captures Playwright.

## Limites à traiter avant production

Voir docs/operations.md : sauvegarde/restauration non encore exercée, privilèges SQL de production à séparer, identité officielle et mentions du reçu à valider, police PDF Unicode nécessaire pour les noms arabes, pagination à étendre au-delà de 1 000 séances. Aucun déploiement de production effectué.

## État final

Application locale démarrée sous Docker sur http://localhost:3000, base PostgreSQL persistante et données fictives disponibles. Vérifications finales : 13 tests unitaires, 7 tests d’intégration et 2 E2E réussis ; TypeScript, lint, build de production et construction Docker réussis. Aucun blocage applicatif identifié dans ces parcours. Les contrôles de production ci-dessus restent nécessaires ; le workflow CI n’a pas été exécuté à distance.
