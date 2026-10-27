/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.6) — « LE PARCOURS » : TEXTES DES BULLES
 * ============================================================================
 * Mêmes règles que td-bulles.js (4 lignes au plus, français courant, aucun mot
 * technique). Ajoutés au dictionnaire de td-bulles.js au chargement : chaque
 * clé est NOUVELLE (une clé existante n'est jamais remplacée).
 * ES5 strict.
 * ========================================================================== */
(function(racine){
  'use strict';
  var T = {
    essParcours: ['Le chemin d’une personne, de l’installation à Pilou+, sur la période choisie en haut. Chaque chiffre dit son unité : « installations », « acceptations », « fois »… On ne divise jamais deux unités différentes.',
      'Les nombres de 1, 2, 4, 6 et des abonnés sont ceux des cartes plus bas, calculés de la même façon ; les autres sont nouveaux.',
      'Pourcentages : jamais sur la semaine en cours, ni sous 20 en bas. Seule exception, l’étape 4, qui suit la carte « Pilulier créé » : pourcentage dès 10 acceptations, semaine en cours comprise.'],
    essArrivent: ['Nouvelles installations ouvertes pour la première fois, selon RevenueCat (le service des abonnements). Nos tests, des robots et les réinstallations sont dedans : ce ne sont pas des personnes.',
      'Même chiffre que « sur … ouvertures de Pilou » de la carte « Nouveaux utilisateurs ».'],
    essAcceptent: ['Grand chiffre : installations qui ont accepté les conditions, à leur premier geste dans Pilou ; même chiffre que la carte « Nouveaux utilisateurs ». « Nos tests » s’applique.',
      'Ligne du dessous, en « fois » (versions 1.4.32 et plus) : la feuille des conditions montrée, acceptée, fermée sans accepter (croix, voile, retour ou changement de page). Une même personne peut la voir plusieurs fois.',
      'Avant l’acceptation, Pilou envoie au plus un message par jour : « fermée sans accepter » est un minimum.'],
    essEssai: ['Installations qui ont fait leur premier essai : premier scan lancé (appareil photo ou galerie) ou première saisie à la main choisie, dans les 30 jours qui suivent l’acceptation (acceptation en 1.4.19 et plus). Versions 1.4.34 et plus, nos tests toujours exclus.',
      'Compté par blocs de plusieurs semaines, pour ne reconnaître personne : un bloc ne se compare pas à une semaine, ni aux autres étapes. Semaines terminées seulement : un bloc se ferme quand il compte au moins 10 premiers essais et 10 premiers piluliers.'],
    essCreent: ['Même chiffre que la carte « Pilulier créé » : premiers traitements enregistrés dans les 30 jours qui suivent l’acceptation (1.4.19 et plus), hors nos tests.',
      'Compté la semaine où il arrive : il peut venir d’une acceptation plus ancienne. Le pourcentage rapproche deux chiffres de la même période, ce n’est pas un suivi des mêmes personnes.',
      'Masqué si une semaine compte moins de 10 acceptations, pour ne reconnaître personne. Pourcentage comme la carte : dès 10 acceptations, semaine en cours comprise.'],
    essRappels: ['Parmi les installations qui ont au moins un traitement en cours avec rappels (ni « si besoin », ni en pause, ni terminé) : celles où les notifications de Pilou sont autorisées. Versions 1.4.34 et plus, hors nos tests. Ce sont des installations, pas des personnes.',
      'État lu au premier message de la semaine du téléphone : une personne qui crée son pilulier dans la semaine est souvent comptée la semaine suivante.',
      'Ne dit rien des alarmes à l’heure exacte (Android), du son coupé ni de l’économie de batterie.',
      'En « 4 semaines », seule la dernière semaine est montrée (un téléphone revient chaque semaine).'],
    essRf5: ['Gestes comptés depuis la version 1.4.36, en « fois », jamais en personnes. On ne calcule aucun taux entre ces lignes.',
      'La fenêtre du téléphone n’est comptée que quand elle pouvait vraiment s’ouvrir : Android 12 et avant, ou un iPhone qui a déjà répondu, ne comptent jamais.',
      '« Rétablis » est un minimum (Pilou fermé pendant les réglages). « Alarmes » : Android seulement ; ces chiffres ne disent pas que les rappels sonnent.',
      'Rien partout alors que la 1.4.36 est installée : soit personne n’est passé par là, soit ces compteurs ont été coupés côté serveur (on ne peut pas les distinguer ici).'],
    essReviennent: ['Retours reçus pendant la période : nouveaux qui rouvrent Pilou le lendemain, du 2ᵉ au 7ᵉ jour, du 8ᵉ au 30ᵉ jour. Mêmes nombres que la carte « Rouvrent Pilou », qui donne aussi le pourcentage.',
      'Les trois lignes ne s’additionnent pas. « Nos tests » s’applique.'],
    essPilouPlus: ['Grand chiffre : feuille Pilou+ ouverte (limite de la formule gratuite atteinte, fonction réservée, historique), en « fois », versions 1.4.34 et plus. Hors limite de scans, comptée ailleurs.',
      'Achats lancés, annulés, autres : gestes dans l’appli, pas des paiements. « Autres » compte aussi un magasin pas prêt : ne jamais faire « réussis = lancés − annulés ». « Depuis une offre » : écran Pilou+ ouvert depuis une carte ou une feuille d’offre, pas un abonnement.',
      '« Limite atteinte » peut être coupé côté serveur avec les compteurs des rappels : un chiffre qui chute d’un coup est à vérifier.',
      'Abonnés payants : même chiffre que la carte « Abonnés Pilou+ ». L’argent : carte « Net » plus bas.']
  };
  var B = racine.TDBulles && racine.TDBulles.textes;
  if(B) for(var k in T) if(Object.prototype.hasOwnProperty.call(T, k) && !Object.prototype.hasOwnProperty.call(B, k)) B[k] = T[k];
  racine.TDEssentielTextes = T;
})(typeof window !== 'undefined' ? window : this);
