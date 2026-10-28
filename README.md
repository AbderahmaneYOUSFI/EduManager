# EduManager

Application locale de gestion d’une école de soutien scolaire : élèves et responsables légaux, professeurs, matières/niveaux/salles, groupes et inscriptions, séances et planning, présences, abonnements mensuels, encaissements partiels, reçus PDF et tableau de bord.

Interface française responsive. Next.js App Router, TypeScript strict, Tailwind 4, composants suivant shadcn/ui, Prisma 7/PostgreSQL 17, Auth.js (next-auth stable), Zod, React Hook Form, FullCalendar et Recharts. Les versions exactes sont dans package-lock.json.

## Démarrage Windows / PowerShell

Prérequis : Node.js 22.12+ et Docker Desktop démarré. Dans PowerShell, utiliser npm.cmd si npm.ps1 est bloqué par la politique du poste.

```powershell
npm.cmd ci
npm.cmd run setup:env
docker compose up -d db
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Ouvrir http://localhost:3000. Le script setup:env crée .env sans écraser un fichier existant, avec des secrets aléatoires et un compte admin@example.test. Le mot de passe généré se trouve uniquement dans ADMIN_PASSWORD du fichier local .env. Aucun mot de passe par défaut n’est distribué. Le seed conserve un compte existant ; modifier ensuite son mot de passe depuis Administration.

Le .env généré active SEED_DEMO=true : quatre élèves et un professeur explicitement fictifs, un groupe et des séances. Sans démonstration, mettre SEED_DEMO=false avant le premier seed. Le seed peut être répété sans dupliquer ces données. Les mensualités ne sont jamais inventées pour remplir les graphiques : les générer depuis Mensualités.

Pour une configuration manuelle, copier .env.example vers .env puis renseigner DATABASE_URL, POSTGRES_PASSWORD, NEXTAUTH_SECRET (32 caractères minimum), ADMIN_EMAIL et ADMIN_PASSWORD (12 caractères minimum). Les mots de passe PostgreSQL utilisés dans une URL doivent être encodés ; le générateur utilise un secret hexadécimal compatible.

## Démarrage entièrement Docker

```powershell
npm.cmd run setup:env
docker compose up -d db
docker compose --profile tools build
docker compose run --rm tools npm run db:migrate
docker compose run --rm tools npm run db:seed
docker compose up -d web
```

Le web est accessible sur http://localhost:3000. Le conteneur tourne avec l’utilisateur node ; PostgreSQL possède un volume persistant. Les migrations sont une étape explicite avant le web. Le service tools fournit le CLI de migration et le seed. Arrêter avec docker compose stop ; conserver le volume. Ne pas supprimer de volume contenant des données à garder.

## Utilisation

1. Créer les matières, niveaux, salles et professeurs.
2. Créer un groupe avec sa capacité et son prix mensuel.
3. Ajouter un élève et ses responsables, puis l’inscrire à un ou plusieurs groupes. Choisir l’abonnement si nécessaire.
4. Planifier une séance ou une série hebdomadaire (52 semaines maximum). Les conflits de salle, professeur et groupe sont refusés.
5. Relever les présences après le début de la séance. Seules les inscriptions actives à cette date sont acceptées.
6. Générer un mois dans Mensualités ; la génération peut être répétée sans doublon.
7. Enregistrer un paiement, ventilé automatiquement par ancienneté sur les mensualités émises de cet élève, puis télécharger le reçu.
8. Une annulation financière exige le rôle Direction et un motif. Elle rétablit les soldes et conserve le paiement et ses allocations.

La modification du prix d’un groupe concerne les nouvelles inscriptions ; les prix des abonnements existants sont conservés. Archiver une fiche ne résilie pas les contrats : clôturer explicitement les inscriptions. Les dates de fin d’inscription sont inclusives. Une clôture rétroactive avec des mensualités postérieures déjà émises est refusée.

Les séances et les graphiques utilisent l’heure d’Alger. L’affichage du calendrier présente les heures locales même si la bibliothèque reçoit des dates décalées pour son mode UTC. Les séances affichées sont limitées aux 1 000 dernières ; le journal d’audit aux 100 dernières actions.

## Rôles

| Rôle | Accès |
| --- | --- |
| ADMIN / Direction | Ensemble de l’école, comptes utilisateurs, audit et annulations financières |
| SECRETAIRE | Gestion scolaire, planning, présences, génération et encaissements ; pas de comptes ni d’annulations |
| PROFESSEUR | Ses groupes, élèves (sans contacts ni finances), séances et présences ; aucun reçu ni paiement |

Créer les comptes professeur depuis Administration après avoir créé leur profil. Une modification des accès ou du mot de passe révoque les sessions existantes. Le dernier administrateur actif ne peut pas être désactivé ni rétrogradé. Les autorisations sont rechargées en base à chaque requête.

## Vérifications

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit --omit=dev --audit-level=high
```

Avec l’application démarrée, `node scripts/smoke.mjs` vérifie également la connexion, la session et le dashboard via HTTP sans afficher les secrets. `npm.cmd audit --audit-level=high` inclut aussi les outils de développement.

Les tests d’intégration et E2E créent une base edumanager_test_<horodatage>, appliquent toutes les migrations puis la suppriment dans un finally. Le rôle PostgreSQL local doit pouvoir créer des bases. Ils n’effacent pas la base de démonstration. E2E utilise le port 3100 et exige un ADMIN_EMAIL et un ADMIN_PASSWORD de test. Ne jamais leur fournir une URL de production.

Les scripts de test s’arrêtent en cas d’échec. PROGRESS.md consigne les résultats effectivement observés. Les captures de contrôle navigateur sont générées dans .local/screenshots (ignoré par Git).

## Organisation et règles

- prisma/schema.prisma et prisma/migrations : modèle exécuté, clés, contraintes, exclusions de planning et protections du grand livre.
- src/modules : schémas Zod, services métier, lectures et reçus.
- src/lib : authentification, transactions sérialisables, Decimal et permissions.
- src/app : navigation, écrans et API.
- .agents/skills : les 13 guides spécialisés ; AGENTS.md : règles de travail.
- DECISIONS.md : arbitrages métier retenus.
- docs/phase-1 : proposition historique, remplacée par les décisions autonomes pour l’implémentation.

La facturation est mensuelle civile : mois commencé complet, échéance le 10, aucune réduction automatique liée aux absences ou vacances. Les paiements ne peuvent dépasser le solde des mensualités déjà émises. Pour une avance, émettre d’abord les mensualités futures. Les calculs de référence utilisent Decimal ; les écritures financières et l’audit sont protégés en SQL.

## Avant production

Aucun déploiement de production n’a été effectué. Voir docs/operations.md pour les sauvegardes, les limites et les contrôles de mise en service. Configurer HTTPS et NEXTAUTH_URL, des secrets propres à l’environnement, les comptes réels, le nom officiel de l’école et un rôle SQL à privilèges limités. Exécuter et restaurer une sauvegarde de test. Valider le modèle de reçu, les besoins réglementaires locaux et la politique de conservation des données avec l’établissement.
