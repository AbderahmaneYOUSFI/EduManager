# Plan détaillé et skills proposés

## Phases et critères de sortie

| Phase | Livrables | Validation attendue |
|---|---|---|
| 1 — conception | Architecture, ER, proposition Prisma, règles, décisions, structure, skills proposés | Revue de l’ensemble et réponses métier ; pas de déploiement ni de migration |
| 2 — socle | Dépendances exactes verrouillées, Next.js, Docker dev, Prisma/config, migrations approuvées, identité, RBAC, layout français responsive | Connexion/déconnexion/révocation, refus serveur par rôle et objet, build, lint, types ; résolution du choix Auth.js |
| 3 — domaine | Élèves/responsables, professeurs/matières/niveaux/années, groupes, tarifs et inscriptions, archivage, audit | Multi-groupes, capacité concurrente, dérogation autorisée, transfert et historique |
| 4 — planning | Salles, disponibilités, récurrences, occurrences, FullCalendar, report/annulation et exclusions SQL | Conflits simultanés sur trois ressources, adjacence acceptée, régénération idempotente |
| 5 — présences | Listes datées, saisie, justification, correction et historique, espace professeur | Unicité et périmètre professeur, arrivée/départ d’élève, non-saisi distinct d’absent |
| 6 — abonnements | Contrats, suspensions, politique validée, générateur, rattrapage et échéances | D1–D7 résolues, prorata/fermeture selon politique, idempotence et tarif historique, tests de calendrier |
| 7 — paiements | Encaissements, allocations, annulation, idempotence, outbox, PDF A4/compact et historique | D8 résolue, Decimal, concurrence sur PostgreSQL, reprise après timeout, refus surallocation, reçu immuable |
| 8 — pilotage | Dashboard Recharts, rapports, filtres, export autorisé, suivi rémunérations selon règles validées | Rapprochement indicateurs/registre, périmètre temporel explicite, accès et absence de données fictives |
| 9 — exploitation | Durcissement, CI, image production, sauvegarde/restauration, guide d’administration, déploiement | Suite complète, essai de restauration, migration à blanc, test de charge selon volume convenu, recette école |

Chaque phase livre des changements revus, documentation mise à jour et résultats exacts des contrôles. Lint, vérification TypeScript, tests concernés et build à partir du socle ; élargir aux tests de non-régression impactés. Arrêt à la validation demandée par l’école avant phase suivante. Les contrôles de concurrence et contraintes ne doivent pas être repoussés à la phase 9.

## Stratégie de test

- Vitest unitaire : périodes, arrondis Decimal, priorité des statuts, normalisation des requêtes et politiques validées.
- Intégration sur **PostgreSQL réel isolé**, pas SQLite : migrations, FK, CHECK, exclusions, transactions, idempotence et triggers. Deux connexions synchronisées pour tester les courses, puis vérification des sommes après commit.
- Playwright : connexion de chaque rôle, saisie élève/inscription, émargement, paiement partiel puis multi-charges, téléchargement autorisé et refus d’accès direct à un objet tiers.
- Fixtures de test séparées ; aucune donnée de démonstration chargée automatiquement en production. Horloge contrôlée, fuseau explicite et comparaisons financières exactes.

Les tests de phase 1 se limitent à une revue de conception et, si un CLI compatible est disponible, à la validation syntaxique du schéma. Il n’y a encore ni application TypeScript, ni lint applicatif, ni tests d’exécution à lancer.

## Six skills à créer après validation

Les chemins ci-dessous sont proposés ; aucun skill actif n’est créé en phase 1. Leur rédaction devra employer le skill `skill-creator` et reprendre les décisions approuvées, sans donner à un skill le pouvoir de les inventer.

| Chemin futur | Déclenchement et mission | Workflow et vérification |
|---|---|---|
| `.agents/skills/school-domain/SKILL.md` | Évolutions élèves, niveaux, groupes et inscriptions | Lire décisions ; intervalle daté ; verrouiller capacité ; archiver ; tester multi-groupes, transfert et concurrence |
| `.agents/skills/subscription-engine/SKILL.md` | Abonnements et mensualités | Refuser politique absente ; figer tarif ; calculer période ; transaction et unicité ; tester mois courts, suspension, idempotence et historique |
| `.agents/skills/payment-ledger/SKILL.md` | Encaissements, allocations et reçus | Autorisation ; Decimal ; clé/hash ; verrous ordonnés ; validation atomique ; audit/outbox ; tester surallocation, double soumission, annulation et concurrence |
| `.agents/skills/school-scheduling/SKILL.md` | Récurrences, salles et séances | Disponibilités ; exclusions SQL ; matérialisation idempotente ; report sans effacement ; tests trois conflits et occurrences |
| `.agents/skills/attendance-management/SKILL.md` | Émargement et absences | Périmètre professeur ; inscription valide à date ; unicité ; audit des corrections ; tests non-saisi, transfert et accès interdit |
| `.agents/skills/school-qa/SKILL.md` | Vérification de changements métier et autorisations | Cartographier invariants ; tests PostgreSQL et parcours ; lancer types/lint/build ; rapport factuel des contrôles et limites |

Chaque skill contiendra un frontmatter name/description, ses préconditions, invariants, opérations interdites, workflow, tests et références vers les ADR. Les trois exemples fournis dans le cahier seront adaptés pour inclure verrous, statut d’annulation, politiques approuvées et protocole d’idempotence.

## ADR à consigner

Monolithe mono-école ; séparation inscription/abonnement/charge/paiement ; calcul dérivé des soldes ; politique financière versionnée ; dates et fuseau ; contraintes SQL supplémentaires ; identité/version Auth.js ; annulation versus remboursement ; documents par outbox ; conservation et restauration. Chaque ADR précise contexte, décision, alternatives, conséquences et date de validation.
