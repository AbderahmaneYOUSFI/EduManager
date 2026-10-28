# Exploitation locale et préparation de production

## Configuration

La configuration de phase 1 reste historique. Le déploiement prévu ici est un monolithe Next.js avec PostgreSQL, sans services externes ni exposition publique automatique. Les images sont construites depuis le lockfile ; les secrets ne sont jamais inclus dans le contexte Docker.

Créer un environnement distinct pour chaque instance. Le compte PostgreSQL de démonstration est propriétaire de la base pour permettre les migrations et les tests ; en production, séparer le propriétaire des migrations du rôle applicatif et ne pas donner à ce dernier les droits DDL, de désactivation des triggers ou de suppression des audits. Les triggers ne protègent pas contre un administrateur SQL capable de les enlever.

Définir NEXTAUTH_URL avec l’URL HTTPS exacte. Auth.js active les cookies sécurisés selon l’URL. Une mutation JSON exige une origine correspondante ; les formulaires de connexion utilisent la protection CSRF d’Auth.js. Sessions de huit heures, version invalidée après modification des accès ou du mot de passe. Les tentatives par adresse de compte sont limitées en base sur quinze minutes. Prévoir une limitation réseau additionnelle au reverse proxy pour une exposition publique.

## Sauvegardes et restauration

Planifier un pg_dump au format custom, chiffrer les archives et conserver une copie hors de l’hôte. Adapter fréquence et rétention aux objectifs de l’école. Ne jamais copier des archives contenant des données personnelles dans le dépôt. Restaurer avec pg_restore dans une base distincte, puis contrôler les nombres d’élèves, mensualités, paiements, allocations et audits. Vérifier quelques soldes et téléchargements de reçus. Documenter la date et le résultat de chaque exercice. La restauration de sauvegarde doit être validée avant production ; elle n’est pas couverte par les tests applicatifs.

Les PDF sont générés à la demande à partir des écritures et instantanés stockés : pas de stockage fichier séparé à sauvegarder dans cette version. Conserver la version applicative associée si une reproduction identique de mise en page est nécessaire.

## Limites explicites

- Un établissement, français et DZD. Aucun portail parent ni traduction arabe. Les noms hors encodage Latin sont remplacés par « ? » uniquement dans le PDF ; prévoir une police Unicode embarquée avant un usage de reçus en arabe.
- Le reçu est un document interne de gestion. Numérotation UUID, sans garantie de séquence fiscale. Validation administrative du format et des mentions nécessaire avant usage officiel.
- Pas de prorata, réduction, avoir, crédit libre, remboursement bancaire, paie des enseignants ni relance automatique. Les annulations n’effectuent aucun mouvement bancaire.
- Génération mensuelle déclenchée par un membre du personnel dans l’interface. Pas de cron externe configuré. Le calcul des retards et soldes est automatique à chaque lecture.
- L’archivage conserve le contrat et l’historique ; clôturer l’inscription pour arrêter les mois futurs. Les corrections de charges émises demandent un futur mécanisme d’avoirs ; elles sont refusées pour préserver l’historique.
- Planning limité aux 1 000 séances les plus récentes ; ajouter une requête par plage et pagination avant un volume plus important. Lectures serveur actuellement prévues pour une petite école ; pas de validation de charge ni de disponibilité garantie.
- Collecte manuelle d’espèces, chèque ou virement ; la validation enregistre une déclaration du personnel, sans vérification bancaire.

## Contrôles avant mise en service

Renseigner l’identité officielle de l’école et valider ses règles de facturation. Désactiver le seed de démonstration sur une nouvelle base de production. Initialiser les comptes nominatifs, tester chaque rôle et gérer la rotation des secrets. Prévoir sauvegarde/restauration, chiffrement des disques, HTTPS, surveillance des erreurs, rétention et procédure d’incident. Exécuter les migrations avec un compte dédié et garder la version précédente de l’application pour un retour compatible. Ne jamais réinitialiser une base de production pour appliquer une migration.
