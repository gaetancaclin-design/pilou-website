/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — PILOTAGE : TEXTES DES BULLES « ? »
 * ============================================================================
 * Textes de la section « Pilotage semaine par semaine » (td-pilotage.js),
 * AJOUTÉS au même dictionnaire que les autres (`TDBulles.textes`), sous des
 * clés en `pil…` : une seule mécanique, une seule façon d'afficher. Fichier à
 * part pour que td-bulles.js ne grossisse pas.
 * Sens vérifié le 17/10/2026 dans la définition de `v_admin_entonnoir_semaine`
 * (migration 20261017151558_pilotage_tranches_v4.sql), dans l'application
 * (mesureAgregeeContrat.ts, scanFlow.ts, AddMedMenu.tsx, parcoursEntree.ts) et
 * dans la fonction d'analyse (analyze-prescription, issues du scan).
 * Règles de td-bulles.js : 4 lignes au plus, français courant. ES5 strict.
 * ========================================================================== */
(function(racine){
  'use strict';
  var PAS_SOUS_10 = 'Pas de pourcentage sous 10, comme ailleurs dans le tableau de bord.';
  var OUV = 'Jours d’ouverture : un message par jour et par installation qui ouvre Pilou (doublon rare si une réponse se perd). Ce ne sont pas des personnes : une installation ouverte 5 jours compte 5. Hors nos tests. Versions 1.4.22 et plus seulement.';
  var T = {
    pilSection: ['Une ligne par semaine, du lundi au dimanche. Indépendant de la période et du bouton « Nos tests » choisis en haut.',
      'Chiffres de l’application : hors nos téléphones de test, et hors installations qui ont désactivé « Contribuer à améliorer Pilou ». RevenueCat et compteurs du serveur : nos tests compris.',
      '« — » : rien de reçu pour cette case — zéro, ou pas encore mesuré : n’en concluez rien. Ce sont des totaux par semaine, sans identifiant.'],
    pilEnCours: ['La semaine commence lundi à 0 h en heure universelle (1 h ou 2 h du matin à Paris) et se termine dimanche à minuit, heure universelle : ses chiffres sont partiels.',
      'À côté de chaque chiffre, la dernière semaine complète, pour situer — pas pour comparer.'],
    pilSemaine: ['Lundi de la semaine. Les chiffres de l’application suivent la semaine en heure universelle ; les achats et l’encaissé, la semaine de Paris ; le serveur du scan, le jour en heure universelle ; RevenueCat, sa propre date du jour.'],
    // Arrivées
    pilArrivees: ['De l’installation à l’acceptation des conditions, à l’accueil.'],
    pilRc: ['Nouveaux clients selon RevenueCat (le service des abonnements). Compte aussi nos tests, des robots et les réinstallations : ce ne sont pas des personnes.'],
    pilActifs: ['Nombre moyen d’installations qui ont ouvert Pilou chaque jour, selon RevenueCat. Nos téléphones de test sont dedans.'],
    pilEntrees: ['Installations qui ont transmis leur parcours d’entrée, hors nos tests, comptées le jour de réception (heure universelle).',
      'Sous-compte : une installation qui s’y oppose, ou qui ne l’a pas transmis dans ses 7 premiers jours, n’y est pas.'],
    pilAcc: ['Installations qui ont accepté les conditions à l’accueil, toutes versions, hors nos tests. Une fois par installation ; une réinstallation compte à nouveau.',
      'Comptées la semaine où la base reçoit l’envoi.'],
    pilAccV2: ['Acceptations faites en version 1.4.19 ou plus. C’est la base du premier traitement : les versions plus anciennes ne le mesurent pas.'],
    pilPartAcc: ['Acceptations divisées par les nouveaux de RevenueCat, même semaine. Ordre de grandeur seulement : RevenueCat compte aussi tests, robots et réinstallations.', PAS_SOUS_10],
    // Activation
    pilActivation: ['Le premier traitement enregistré : c’est là que Pilou commence à servir.'],
    pilPt: ['Premier traitement enregistré, le jour du premier essai ou plus tard, dans les 30 jours qui suivent l’acceptation (acceptations en 1.4.19 ou plus), hors nos tests.',
      'Compté la semaine où il arrive : il peut venir d’une acceptation d’une semaine précédente. Masqué quand la semaine compte moins de 10 acceptations en 1.4.19 ou plus.'],
    pilPartPt: ['Premiers traitements divisés par les acceptations en 1.4.19 ou plus de la même semaine. Ce n’est pas un suivi des mêmes installations : un premier traitement tardif compte la semaine où il arrive.', PAS_SOUS_10],
    // Retour
    pilRetour: ['Installations qui rouvrent Pilou après le jour de leur acceptation, et jours d’ouverture. Les colonnes ne s’additionnent pas.'],
    pilJ1: ['Installations qui rouvrent Pilou le lendemain de leur acceptation, hors nos tests, au plus une fois chacune, comptées la semaine où la base le reçoit.'],
    pilJ27: ['Installations qui rouvrent Pilou entre le 2ᵉ et le 7ᵉ jour après leur acceptation, hors nos tests, au plus une fois chacune, comptées la semaine où la base le reçoit.'],
    pilJ830: ['Installations qui rouvrent Pilou entre le 8ᵉ et le 30ᵉ jour après leur acceptation, hors nos tests, au plus une fois chacune, comptées la semaine où la base le reçoit.'],
    pilOuvR: [OUV, '« < 7 j » : installations acceptées depuis moins de 7 jours.'],
    pilOuvA: [OUV, '« ≥ 7 j » : acceptées depuis 7 jours ou plus. Avant la 1.4.32, comprend aussi les installations dont la date est inconnue ; à partir de la 1.4.32, additionne les tranches 7-30 j, 31-90 j et plus de 90 j.'],
    // Scan
    pilScan: ['Vu par le téléphone, hors nos tests. Des essais, pas des personnes : quelqu’un qui recommence compte deux fois.'],
    pilScans: ['Scans d’ordonnance lancés, toutes versions, hors nos tests.'],
    pilPhotos: ['Appareil photo (ou choix d’une image) ouvert puis refermé sans photo : l’annulation seule, ni refus ni panne. Compté seulement depuis la 1.4.22.'],
    pilPartPhoto: ['Photos annulées divisées par les scans lancés. Les scans comptent toutes les versions, les annulations seulement la 1.4.22 et plus : la part est sous-estimée tant que des téléphones restent sur une version plus ancienne.', PAS_SOUS_10],
    pilListes: ['Listes de médicaments rendues au téléphone après l’analyse, toutes versions.'],
    pilValidees: ['Listes issues d’un scan que la personne a enregistrées. Depuis la 1.4.22.'],
    pilCorrigees: ['Parmi les listes enregistrées, celles que la personne a modifiées. Depuis la 1.4.22.'],
    pilPartCorr: ['Listes corrigées divisées par les listes enregistrées.', PAS_SOUS_10],
    pilSaisies: ['Traitements saisis à la main, sans scan. Depuis la 1.4.22. Un nombre, pas des personnes.'],
    pilServeur: ['Compté par le serveur, par envoi à l’analyse. Sans filtre « appareil de test » : nos essais sont dedans (le 10/10, une séance de banc a ajouté 84 listes et 20 refus en un jour).',
      'Ne pas additionner avec les chiffres du téléphone : ce n’est pas la même façon de compter.'],
    pilSrvListes: ['Analyses qui ont rendu une liste d’au moins un médicament.'],
    pilSrvVides: ['Analyses qui ont rendu une liste vide : aucun médicament reconnu.'],
    pilSrvRefus: ['Envois refusés parce qu’une limite était atteinte : trop d’envois depuis une même adresse, ou plafond global du service sur 24 heures.'],
    pilSrvEchecs: ['Tous les autres échecs : envoi invalide, image refusée ou trop lourde, réponse illisible, panne ou lenteur du service d’analyse.'],
    // Abonnement
    pilAbonnement: ['De l’écran d’abonnement à l’argent encaissé. Achats : production seulement, les achats de test des magasins et les accès offerts sont exclus ; semaine de Paris.'],
    pilEcran: ['Arrivées sur l’écran d’abonnement, toutes versions, hors nos tests. Des visites, pas des personnes.'],
    pilQuota: ['Appuis refusés parce que la limite mensuelle de scans était atteinte (l’écran d’abonnement s’ouvre alors). Des appuis, pas des personnes ; ne pas le retirer des scans lancés.'],
    pilAchats: ['Premiers achats payants, hors essais gratuits, annoncés par Google et Apple (via RevenueCat).',
      'Un essai gratuit qui devient payant est compté par RevenueCat comme un renouvellement, pas comme un achat.'],
    pilEssais: ['Essais gratuits commencés, annoncés par Google et Apple (via RevenueCat).'],
    pilRenouv: ['Renouvellements d’abonnement annoncés par Google et Apple (via RevenueCat). Comprend aussi les essais gratuits devenus payants.'],
    pilEncaisse: ['Ce que les acheteurs ont payé en euros, avant la part de Google ou d’Apple : le net est plus bas. Les remboursements ne sont pas déduits ; essais et partage familial ne comptent pas.',
      'Euros seulement : les autres monnaies sont comptées à côté.'],
    pilDevises: ['Nombre d’encaissements payés dans une autre monnaie que l’euro : leur montant n’est pas dans l’encaissé brut.'],
    // À partir de la 1.4.32
    pilV432: ['Colonnes remplies par la version 1.4.32 et les suivantes : « — » tant qu’aucun téléphone ne l’a.'],
    pilOuvM: [OUV, 'Installations acceptées depuis 7 à 30 jours.'],
    pilOuvT: [OUV, 'Installations acceptées depuis 31 à 90 jours.'],
    pilOuvL: [OUV, 'Installations acceptées depuis plus de 90 jours.'],
    pilOuvI: [OUV, 'Tranche « inconnue » : mélange les envois faits avant l’acceptation des conditions et les installations dont la date d’acceptation est inconnue.'],
    pilPresentes: ['Installations présentes : au plus une case par installation et par semaine — la semaine de l’appareil (lundi, date du téléphone), reçue dans la semaine de la base. Hors nos tests.',
      'Ce sont des installations, pas des personnes.'],
    pilPresTranche: ['Installations présentes cette semaine, par ancienneté depuis l’acceptation. Au plus une case par installation et par semaine. « Inconnue » : envoi fait avant l’acceptation, ou date d’acceptation inconnue.'],
    pilRappels: ['Installations présentes dont les notifications étaient autorisées au moment de l’envoi.'],
    pilPartRappels: ['Présentes avec rappels autorisés divisées par les installations présentes.', PAS_SOUS_10]
  };
  var D = racine.TDBulles && racine.TDBulles.textes;
  if(D) for(var k in T) if(Object.prototype.hasOwnProperty.call(T, k) && !Object.prototype.hasOwnProperty.call(D, k)) D[k] = T[k];
  racine.TDPilotageTextes = T;
})(typeof window !== 'undefined' ? window : this);
