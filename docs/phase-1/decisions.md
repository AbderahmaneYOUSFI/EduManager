# Décisions à confirmer avant implémentation

Aucune des recommandations du cahier des charges n’est considérée comme validée. La politique de facturation reste non configurée ; la génération devra refuser de fonctionner tant que les décisions bloquantes ne sont pas enregistrées.

| ID | Question | Réponses à préciser | Effet |
|---|---|---|---|
| D1 | Période de facturation ? | Mois civil ou cycle glissant depuis l’inscription | Bornes des périodes, première échéance |
| D2 | Inscription en cours de période ? | Mois complet, prorata ou montant administratif | Base du premier montant ; pour prorata préciser jours calendaires ou séances, arrondi et fin de mois |
| D3 | Vacances et fermeture ? | Facturation maintenue, suspension ou réduction | Calendrier de facturation, périodes fermées |
| D4 | Absences ? | Mensualité fixe ou réduction pour certaines absences | Justificatifs, validation et ajustement |
| D5 | Réductions ? | Par matière, globales par élève ou combinaison | Priorité, plafond, cumul, ventilation et arrondis |
| D6 | Échéance ? | Jour du mois ou délai après début de période ; grâce éventuelle | Date précise et moment de passage en retard ; traitement du 29/30/31 |
| D7 | Changement de groupe en cours de période ? | Effet période suivante ou ajustement de la période actuelle | Risque de double facturation, avoir/complément, conservation des tarifs |
| D8 | Paiements anticipés ? | Interdits, autorisés sur mensualités futures déjà émises, ou crédit libre | Crédit élève et remboursement éventuels |

Pour D1/D2/D4, le cahier propose respectivement mois civil, plusieurs possibilités pour le premier mois, et abonnement fixe malgré les absences. Ces suggestions restent à confirmer.

Décisions complémentaires avant la phase concernée :

- **Architecture / phase 2 :** accepter le monolithe mono-école et la matrice RBAC ; choisir fournisseur d’identité et méthode de connexion ; arbitrer l’exception Auth.js bêta face à l’exigence stable. Préciser hébergement et personnes autorisées à administrer les comptes.
- **Phase 3 :** définir les niveaux exacts, champs obligatoires, numérotation d’inscription, capacité et pouvoir de dérogation ; confirmer que deux inscriptions simultanées au même groupe sont interdites.
- **Phase 4 :** préciser semaine scolaire, jours fermés, durée des séances, remplacements de professeurs et délai d’annulation/report.
- **Phase 6 :** préciser pause/reprise, résiliation, impayés des années précédentes, rétroactivité et corrections de charges émises. Une réduction globale et les avoirs nécessitent d’étendre le schéma avant activation.
- **Phase 7 :** moyens de paiement, ventilation manuelle ou ordre automatique (ancienneté proposée), annulation versus remboursement réel, autorisations, format et numérotation des reçus. Identité officielle de l’école, adresse et téléphone nécessaires au PDF. Aucun envoi automatique aux parents n’est inclus.
- **Rémunération :** montant horaire ou par séance, séances annulées, absences du professeur, validation et éventuels paiements de rémunération. Le modèle proposé calcule des droits ; il ne constitue pas une comptabilité de paie.
- **Exploitation :** données à importer, durées de conservation, rétention sauvegardes, RPO/RTO, volume prévu, utilisateurs simultanés et exigences d’hébergement.

## Validation attendue

Confirmer l’architecture et répondre D1 à D8. Les réponses peuvent être enregistrées comme décisions datées avec auteur et version ; chaque changement de politique doit avoir une date d’effet et préserver les mensualités existantes. Une approbation de l’architecture seule ne vaut pas approbation implicite des options métier.
