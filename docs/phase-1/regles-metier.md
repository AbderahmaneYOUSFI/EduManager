# Règles métier et cas limites

## Inscription, abonnement et historique

Un élève peut appartenir à plusieurs groupes ; une inscription représente un intervalle d’appartenance à un seul groupe. Une réinscription crée un nouvel intervalle. Les chevauchements pour un même élève/groupe sont interdits. Sa classe pour une année est conservée dans `StudentAcademicYear`, afin qu’un changement d’année ne réécrive pas les rapports anciens.

Inscrire sous transaction : verrouiller le groupe, compter les inscriptions qui chevauchent la période demandée, vérifier capacité, puis créer. Les opérations modifiant capacité ou dates suivent le même verrouillage. Une dérogation exige `groups.capacity.override`, un acteur et un motif audités. Les places disponibles se calculent pour une date donnée ; ne pas compter toutes les inscriptions historiques.

Le tarif standard est versionné par `PricingPlan`. L’abonnement conserve le tarif accepté, l’intervalle de validité et la politique applicable. Les intervalles d’abonnements d’une même inscription ne se chevauchent pas ; une suspension est un intervalle explicite, pas seulement le statut actuel. Aucun changement de tarif standard ne modifie un contrat ni une charge émise.

Changement de groupe : terminer l’ancienne inscription et ses abonnements à une date d’effet, créer une nouvelle inscription et un nouvel abonnement, relier les deux inscriptions. Les anciennes charges restent reliées à l’ancienne inscription. Traitement financier de la période en cours soumis à D7. Ne jamais déplacer une mensualité ancienne sur le nouveau groupe.

## Génération des mensualités

Le schéma utilise une période `[periodStart, periodEnd)` et un mois/année de référence, afin de rester compatible avec D1. Clé unique abonnement + début de période. En mois civil, début obligatoirement le premier du mois ; en cycle glissant, l’ancrage et la règle des mois courts sont déterministes après validation. Les références année/mois correspondent au début local de période.

Le service vérifie d’abord une politique complète et approuvée. Il calcule les périodes depuis l’historique d’activation, les suspensions et les bornes de l’année scolaire, puis fige montant initial, réduction, net, échéance, politique et libellé. Insertion idempotente sous contrainte unique ; un doublon identique retourne l’existant, un contenu différent déclenche un conflit à examiner. Ni mise à jour silencieuse ni rattrapage fondé uniquement sur le statut courant.

Les suspensions/vacances, proratas, absences et réductions restent bloqués par D2–D5. Une charge nulle peut représenter une remise totale explicitement autorisée ; elle est payée sans encaissement fictif. Toute correction d’une charge émise nécessitera un mécanisme d’ajustement immuable validé avant développement ; ce schéma ne propose pas encore un registre d’avoirs.

## Paiement et allocations

`Payment` est l’encaissement ; `PaymentAllocation` répartit son montant sur des charges d’un même élève. Montants strictement positifs pour paiements et allocations. Les écritures en brouillon ne comptent pas dans les soldes. À la validation, proposition sans crédit libre : somme des allocations égale au montant encaissé. Le modèle autorise techniquement un montant non affecté, mais le service de validation le refuse tant que D8 n’a pas autorisé et défini le crédit libre. Le crédit libre imposerait un registre dédié avant activation.

Séquence atomique : contrôler identité et permission ; réserver la clé d’idempotence ; verrouiller l’élève et les charges dans l’ordre des UUID ; relire les soldes ; vérifier propriété, devise, montants et allocations ; insérer paiement validé, allocations, numéro unique de reçu, instantané et événement outbox ; journaliser ; commit. Les services d’annulation et de facturation utilisent le même ordre de verrous. Isolation SERIALIZABLE et reprise bornée des conflits de sérialisation/deadlocks ; aucune reprise des erreurs métier. Prisma 7 expose ces niveaux : [transactions Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

La clé d’idempotence est unique et le hash porte sur la requête canonique (élève, montants décimaux, méthode et allocations triées). Même clé/même contenu retourne le paiement ; même clé/autre contenu est un conflit. Après timeout réseau, le client réutilise la clé. Une annulation répétée ne crée pas de second mouvement.

Annulation proposée : ADMIN, motif obligatoire, `cancelledAt` et acteur, allocations conservées mais exclues des agrégats. Réouverture automatique des soldes concernés, reçu conservé et marqué annulé lors de consultation. Une annulation ne représente pas un remboursement d’espèces : un remboursement réel nécessitera un modèle dédié, à valider. Les écritures validées ne sont ni éditées ni supprimées ; corriger par annulation et nouvelle saisie liée via audit.

## Solde et statut calculés

Pour chaque charge : `encaissé = somme(allocations dont paiement VALIDATED)` ; `solde = net - encaissé` avec Decimal et `0 ≤ encaissé ≤ net`. Priorité :

1. `PAYE` si solde = 0.
2. `EN_RETARD` si solde > 0 et date locale du jour > échéance (sous réserve du délai de grâce D6).
3. `PARTIEL` si encaissé > 0.
4. `NON_PAYE` sinon.

Une charge partiellement réglée et échue affiche EN_RETARD avec montant partiel distinct. À l’échéance elle-même, pas encore de retard selon cette proposition. Un paiement annulé est exclu partout : soldes, taux, graphiques et totaux. Pour un état historique, reconstruire à partir des instants de validation/annulation, pas du seul statut actuel.

Exemple de vérification : net 6 000, paiement validé 2 500 → encaissé 2 500, solde 3 500 ; après échéance statut EN_RETARD. Après annulation → encaissé 0, solde 6 000. Aucun usage de `Number`, `parseFloat` ou flottants pour l’arithmétique monétaire ; arrondi unique à la frontière métier selon politique approuvée.

## Reçus

Numéro généré avec séquence SQL ou compteur verrouillé, jamais par comptage. Unicité garantie ; des trous de numérotation peuvent exister, pas de promesse de séquence sans trou. Reçu lié 1:1 au paiement, instantané immuable de l’école, de l’élève, des lignes, montants, mode, date et caissier. Le worker génère A4 et compact depuis cet instantané, pas depuis les coordonnées actuelles. Échec PDF : paiement conservé et reçu en attente/échec avec reprise idempotente ; interface distingue validation et disponibilité du document. Stockage privé, téléchargement authentifié, empreinte de contenu pour contrôler l’artefact.

## Planning et présences

Une règle récurrente produit des séances matérialisées ; clé règle + instant d’occurrence initiale, conservée même après report. Une séance exceptionnelle n’a pas de règle. Modifier la règle ne réécrit pas les séances terminées ni leurs présences. Reporter une séance conserve son identité et son occurrence d’origine, modifie ses horaires et journalise l’ancien créneau ; annuler conserve tout l’historique.

Conflit si deux intervalles actifs `[start,end)` se chevauchent pour salle, professeur ou groupe. Deux séances consécutives sont autorisées. À toute création/report/réactivation, vérifier aussi la disponibilité effective du professeur, la capacité de salle et les dates du groupe. Les séances annulées libèrent le créneau. Une disponibilité hebdomadaire et ses exceptions datées sont toutes deux représentées.

Une présence est unique par élève/séance et liée à l’inscription qui était valide à la date locale de la séance. État non saisi distinct d’absent : aucune ligne signifie « non renseigné ». Présent, absent, retard ou absence justifiée ; motif/commentaire et historique d’audit à chaque correction. Le professeur doit être autorisé sur cette séance. Pas de suppression de présence lors d’un changement de groupe.

## Contraintes PostgreSQL à ajouter par migrations

Le fichier Prisma est une proposition relationnelle, pas une garantie suffisante à lui seul. Avant production, les migrations doivent inclure :

| Domaine | Garantie SQL et protocole |
|---|---|
| Montants | CHECK positifs/non négatifs ; réduction ≤ initial ; net = initial − réduction ; devise DZD |
| Dates | CHECK début < fin pour tous les intervalles et jours ISO 1–7 ; minutes 0–1440 ; jour échéance 1–31 |
| Inscriptions/abonnements | Exclusions GiST sur intervalles par élève/groupe et par inscription ; `btree_gist` ; prendre en compte bornes ouvertes et statuts annulés |
| Planning | Trois exclusions GiST sur `tstzrange(start,end,'[)')` par salle/professeur/groupe, WHERE statut différent de CANCELLED |
| Capacité/disponibilité | Verrouillage de la ressource avant lecture et écriture ; tout changement de disponibilité suit le même protocole que réservation |
| Allocations | Unicité paiement/charge ; trigger différé contrôlant élève identique, sommes de paiements et charges, avec verrous parents ; contrôle lors de VALIDATED et lors de toute réactivation |
| Historique | Triggers interdisant DELETE/édition des champs financiers validés, allocations et instantanés ; seules transitions de statut prévues autorisées ; audit append-only |
| Cohérence | Année du groupe = année de l’inscription ; abonnement inclus dans inscription ; présence liée au bon élève/groupe ; professeur habilité ; mois/année de référence cohérents |
| Politique | Version approuvée immuable et date d’effet ; un seul paramètre école ; validation structurée JSON par Zod |

Les agrégats interlignes ne peuvent pas être garantis par un simple CHECK. Les contraintes différées et les services doivent partager le protocole de verrouillage, y compris en annulation et modification administrative. Les exclusions SQL sont nécessaires même si le calendrier effectue déjà un contrôle visuel.

## Archivage, suppression et rapports

Élèves, responsables, professeurs, groupes, matières, niveaux et salles sont archivés via date ; inscriptions et abonnements terminés conservent leurs dates et statuts. FKs métier en RESTRICT, aucun cascade effaçant des finances ou présences. Comptes désactivés, auteur financier conservé. Tables purement techniques d’authentification nettoyables ; effacement/anonymisation des données personnelles à définir sans casser les pièces conservées.

Indicateurs calculés : élèves actifs = élèves distincts inscrits à la date ; encaissements mensuels = paiements validés par date d’encaissement (périmètre temporel affiché) ; facturé = net des charges de période ; impayé échu = somme des soldes positifs échus. Taux de recouvrement = allocations valides des charges de période / net de ces mêmes charges ; dénominateur nul → « sans objet ». Ne pas diviser les encaissements du mois par le facturé du mois si les paiements couvrent d’anciennes périodes.

Présence : rapport séparant présents, retards, absents justifiés et non renseignés ; définition du taux à approuver. Remplissage par date et capacité ; séances effectuées seulement COMPLETED. Rémunération figée par professeur/séance avec tarif appliqué, mode horaire ou par séance, durée et statut de validation ; unique par séance et professeur.

## Cas limites à tester

Multi-groupes, réinscription, groupe complet avec deux admissions concurrentes, dérogation sans droit, transfert sans perte d’historique ; facturation répétée, double worker, fin de mois, février bissextile, inscription tardive, suspension rétroactive et fin d’année ; tarif modifié sans effet rétroactif ; paiement 2 500/6 000, multi-charges, montant supérieur au solde, élève différent, décimales invalides, double clic, timeout après commit, deux paiements concurrents et annulation concomitante ; conflit de salle/professeur/groupe, disponibilité modifiée en concurrence, séances adjacentes, report répété ; présence hors intervalle, double saisie et accès professeur à une séance tierce ; PDF en échec et régénération ; statistiques à zéro et paiements de périodes antérieures.
