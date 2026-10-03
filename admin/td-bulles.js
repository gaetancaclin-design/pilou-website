/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — LES BULLES « ? » : TEXTES ET MÉCANIQUE
 * ============================================================================
 * UN SEUL ENDROIT pour tous les textes d'explication (demande de Gaétan :
 * plus de grands textes sous les chiffres). Règles : 4 lignes au plus, français
 * courant, aucun mot technique (ni « dénominateur », ni « jalon », ni « charge »,
 * ni « cohorte », ni « Wilson »). « Fourchette » est permis, expliqué.
 * Mécanique reprise de la console détaillée (index.html, l. 5037-5061) : la
 * bulle s'ouvre au survol (souris), au focus clavier et au toucher ; le focus
 * est donné explicitement (Safari iOS ne le fait pas) ; second appui, appui
 * ailleurs ou Échap referment. ES5 strict. Expose `TDBulles`.
 * ========================================================================== */
(function(racine){
  'use strict';

  var T = {
    ouvertures: ['Installations de Pilou ouvertes pour la première fois, selon RevenueCat (le service des abonnements).',
      'Ce ne sont pas des téléchargements : une installation jamais ouverte n’est pas vue.',
      'Nos téléphones de test sont dedans : RevenueCat ne sait pas les reconnaître.',
      'Petite courbe : moyenne par jour des dernières semaines.'],
    nouveaux: ['Personnes qui ont fait leur premier geste dans Pilou (photo, saisie, achat ou code) : c’est là que l’usage commence.',
      'Compté par l’application elle-même. Une réinstallation compte à nouveau.',
      'Le bouton « Nos tests », en haut, décide si nos téléphones sont comptés.'],
    pilulier: ['Nouveaux qui ont enregistré leur premier traitement, le jour du premier essai ou dans les 30 jours. Installations récentes seulement (1.4.19 et plus).',
      'Toujours sur 4 semaines, jamais sur une seule : sur la dernière période, c’est exactement le chiffre de la console détaillée.',
      'Sous 10 nouveaux, rien n’est affiché, pour ne reconnaître personne. Un pilulier créé tard compte la semaine où il arrive : le chiffre peut encore monter.'],
    actifs: ['Nombre moyen d’installations qui ont ouvert Pilou chaque jour, selon RevenueCat.',
      'Nos téléphones de test sont dedans.',
      '« Provisoire » : un jour n’a pas encore été relu en entier.'],
    reviennent: ['Nouveaux qui rouvrent Pilou après leur premier jour. Les deux lignes ne s’additionnent pas.',
      'Le pourcentage porte sur les 4 dernières semaines complètes, dès qu’elles sont mesurées et comptent 10 nouveaux.',
      'Les retours arrivent avec retard : chiffre prudent.'],
    abonnes: ['Abonnés qui paient en ce moment, selon RevenueCat, quelle que soit la période choisie.',
      'Compté en production, hors essais, comme dans la console détaillée.'],
    net: ['Ce que Google et Apple vous doivent pour le mois, après TVA et leur part, remboursements déduits.',
      'Pas encore sur votre compte : ils versent plus tard. Avant vos cotisations et impôts.',
      'Jours comptés en heure universelle.'],
    scan: ['Chaque ligne compte des essais, pas des personnes : quelqu’un qui recommence compte deux fois.',
      'Compté par le téléphone, souvent avec retard : un chiffre bas ne prouve pas un abandon.',
      'Pourcentages : part des scans lancés.'],
    scanRecent: ['Mesurées seulement par la version 1.4.22 et suivantes (Android publiée le 03/10). Sur iPhone, tant qu’Apple ne l’a pas publiée, ces lignes viennent de TestFlight ou des examinateurs d’Apple.',
      '« Liste enregistrée » : part des scans lancés avec ces versions. « Liste corrigée » : part des listes enregistrées que la personne a modifiées.',
      '« Saisie à la main » : traitement saisi sans scan, nombre seul. Pas de pourcentage sous 10.'],
    serveur: ['Compté par le serveur : listes rendues en moins d’une minute, sur les envois à l’analyse. Nos essais sont dedans.',
      'Ne pas l’additionner avec les lignes du dessus : ce n’est pas la même façon de compter.',
      'Un chiffre bas ne prouve pas un abandon.'],
    officines: ['Personnes qui ont obtenu leur accès offert avec le code d’un apporteur, depuis le début (24 mois au plus), quelle que soit la période.',
      '« A payé » : au moins un vrai paiement après l’activation.',
      'Nos propres tests ne sont jamais dans ces chiffres.'],
    tests: ['Allumé : nos téléphones de test sont comptés dans les chiffres mesurés par l’application.',
      'Les chiffres marqués « tests inclus » les comptent toujours : leur source ne sait pas les reconnaître.'],
    etat: ['L’état de la console détaillée, lu à l’instant, hors attentes de données : un taux qui ne peut pas encore être calculé parce que la mesure a commencé le 21/09 n’est pas compté (la console détaillée, elle, le compte en orange).',
      'Vert : rien à signaler. Orange : à surveiller. Rouge : problème. Gris : pas lu.',
      'S’y ajoutent les chiffres que cette page n’a pas pu lire. Détail, « Collecter » et « Sauvegarder » : console détaillée.'],
    paiements: ['Paiements annoncés par Google et Apple : aucun en attente, l’alarme fonctionne.'],
    revenus: ['Revenus et commissions de la section Argent : renouvellement manquant, remboursement annulé, paiement sans net, solde négatif ou commission sans règle. À vérifier dans la console détaillée.'],
    securite: ['Un seul compte existe sur la base : le vôtre. Un compte de plus voudrait dire que l’inscription s’est rouverte.'],
    codes: ['Chaque code saisi a donné son accès, aucun code n’est épuisé, les échanges iPhone sont attribués.'],
    scanServeur: ['Le service qui lit les ordonnances répond, sans échec ni lenteur ces deux derniers jours.'],
    mesure: ['Envois de l’application refusés par le serveur. Doit rester à 0 : sinon, défaut de l’application ou appels venus de l’extérieur.',
      'Gris « … dès le jj/mm » : attente normale, des taux n’ont pas encore leurs 4 semaines complètes (détail ci-dessous). Orange « aucune remontée la semaine du … » : la dernière semaine close n’a reçu aucun envoi réel. Orange « aucun nouvel utilisateur mesuré » : 0 premier pas la dernière semaine close, contre 10 ou plus la semaine d’avant. « Noms inconnus » : la base compte quelque chose que la console ne sait pas nommer. « Taux incomplets » : la console détaillée ne peut pas encore calculer un de ses taux sur 4 semaines (semaine sans remontée, ou plus de retours que de nouveaux). Détail dans sa section « Parcours dans le temps ».'],
    collecte: ['Les chiffres de RevenueCat doivent être collectés au moins tous les 28 jours : au-delà, les jours manquants sont perdus.',
      'Bouton « Collecter » dans la console détaillée.'],
    sauvegarde: ['La base n’a aucune sauvegarde automatique : un fichier au moins tous les 8 jours.',
      'Bouton « Sauvegarder » dans la console détaillée.'],
    recente: ['Lecture des chiffres envoyés par la version 1.4.22. Une ligne illisible ou un nom inconnu les met de côté, sans toucher au reste de la page.'],
    autres: ['Point signalé par la console détaillée en dehors de la santé technique (par exemple un chiffre illisible). Le détail y est.']
  };

  function ech(s){ return racine.TDCalc.ech(s); }
  var numero = 0;

  // `cle` : un texte de T ; `extra` : lignes de données ajoutées (échappées).
  function aide(nom, cle, extra){
    var lignes = (T[cle] || []).concat(extra || []);
    if(!lignes.length) return '';
    numero++;
    var id = 'td-bulle-' + numero, h = [];
    for(var i = 0; i < lignes.length; i++) h.push(ech(lignes[i]));
    return '<span class="aide"><button type="button" class="q" aria-label="Explication : ' + ech(nom)
      + '" aria-describedby="' + id + '">?</button><span class="bulle" role="tooltip" id="' + id + '"><b>'
      + ech(nom) + '</b> : ' + h.join('<br>') + '</span></span>';
  }

  // Écouteurs posés UNE fois (délégués : ils survivent à chaque rendu).
  function installer(){
    var ouvertAvant = null;
    function bouton(t){ return t && t.closest ? t.closest('.aide>button') : null; }
    document.addEventListener('pointerdown', function(e){
      var bt = bouton(e.target), actif = document.activeElement;
      ouvertAvant = (bt && actif === bt) ? bt : null;
      var aideActive = actif && actif.closest ? actif.closest('.aide') : null;
      if(aideActive && !aideActive.contains(e.target) && actif.blur) actif.blur();
    }, true);
    document.addEventListener('click', function(e){
      var bt = bouton(e.target);
      if(!bt) return;
      if(ouvertAvant === bt) bt.blur(); else bt.focus();
      ouvertAvant = null;
    });
    document.addEventListener('keydown', function(e){
      var actif = document.activeElement;
      if(e.key === 'Escape' && actif && actif.closest && actif.closest('.aide') && actif.blur) actif.blur();
    });
  }

  racine.TDBulles = { textes:T, aide:aide, installer:installer };
})(typeof window !== 'undefined' ? window : this);
