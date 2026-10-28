---
name: deployment-devops
description: Préparer le démarrage Docker et l’exploitation EduManager.
---

Fournir image multi-stage non privilégiée, PostgreSQL avec volume et healthcheck, migrations explicites. Secrets dans environnement ignoré. Initialiser l’admin sans mot de passe par défaut. Aucun déploiement de production sans autorisation ; documenter sauvegarde et restauration avant mise en service.
