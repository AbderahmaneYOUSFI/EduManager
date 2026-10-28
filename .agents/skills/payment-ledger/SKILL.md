---
name: payment-ledger
description: Encaisser et annuler les paiements scolaires avec traçabilité.
---

Tous les calculs utilisent Decimal. Une transaction sérialisable vérifie les soldes, ventile par ancienneté, enregistre paiement et audit. Une clé idempotente lie une requête à son contenu. Refuser surpaiement et ventilation interélèves. Annuler avec motif et acteur sans supprimer paiement ni allocations.
