# Décisions d’implémentation — 28 octobre 2026

Les consignes autonomes jointes remplacent les validations intermédiaires des documents de phase 1. Ces documents décrivent une proposition antérieure, pas l’état de l’application.

- Monolithe mono-école, interface française, DZD et fuseau Africa/Algiers.
- Next.js 16, React 19, Prisma 7 et adaptateur pg ; Auth.js via next-auth stable 4.24.15, JWT de huit heures et relecture des droits en base. Aucun rôle de confiance dans le navigateur.
- Mois civil, mois commencé entier, échéance au 10 même lors d’une inscription ultérieure au 10. Fin d’inscription inclusive. Vacances et absences ne réduisent pas le montant. Pas de réductions automatiques.
- Un abonnement par inscription ; prix convenu figé à l’inscription, sans réécriture de l’historique lors d’un changement de prix du groupe. Fin d’inscription explicite pour résiliation. Un transfert nécessite clôture puis nouvelle inscription ; deux groupes différents peuvent donc facturer le même mois entier.
- Paiements répartis sur mensualités émises par ancienneté, sans crédit libre ni surpaiement. Les avances exigent l’émission préalable des mois concernés. Annulation réservée à ADMIN, motivée et auditée ; aucun remboursement bancaire réel.
- Reçus numérotés par UUID unique, rendus à la demande depuis un instantané école/élève et les écritures immuables ; mention d’annulation selon l’état actuel. Les PDF ne constituent pas une certification fiscale.
- Séances ponctuelles ou récurrence hebdomadaire bornée ; conflits de salle, groupe et professeur interdits. Capacité stricte sans dérogation. Les disponibilités complexes et la paie des professeurs sont hors du périmètre demandé.
- Guides spécialisés conservés dans .agents/skills du projet. Pas d’installation globale hors de l’espace de travail.
- Aucun déploiement externe : le cahier demande une application locale et une préparation au déploiement. Le workflow Sites est limité au mode local, en conservant la stack imposée.
