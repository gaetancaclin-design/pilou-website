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
    ouvertures: ['Ouvertures : installations de Pilou ouvertes au moins une fois, comptées le jour de leur première ouverture, selon RevenueCat (le service des abonnements) ; nos tests compris, toutes versions. Ce ne sont pas des téléchargements.',
      'Nouveaux utilisateurs : premier pas réel dans Pilou (photo, saisie, achat ou code), compté par l’application, hors tests sauf si « Nos tests » est allumé.',
      'Le rapport des deux est un ordre de grandeur : les nouveaux sont comptés hors tests (par défaut), alors que les ouvertures comptent nos tests. Il dit où l’on perd du monde : peu d’ouvertures, c’est attirer qu’il faut travailler ; des ouvertures sans premier pas, ce sont les premiers écrans.',
      '« Environ 1 sur … » (ou « soit … % » quand c’est plus des deux tiers) seulement quand les deux nombres valent au moins 10 et que les ouvertures sont complètes.'],
    nouveaux: ['Acceptations : installations qui ont accepté les conditions à leur premier geste dans Pilou (photo, saisie, achat ou code) ; c’est là que l’usage commence. « Nos tests » éteint, c’est le chiffre de la colonne « Acceptations » de l’historique.',
      'Compté par l’application elle-même, hors installations qui ont désactivé « Contribuer à améliorer Pilou ». Une réinstallation compte à nouveau.',
      'Le bouton « Nos tests », en haut, décide si nos téléphones sont comptés.',
      'Petite courbe : nouveaux par semaine, sur les dernières semaines complètes.'],
    pilulier: ['Nouveaux qui ont enregistré leur premier traitement, le jour du premier essai ou plus tard, dans les 30 jours qui suivent l’acceptation. Acceptations en 1.4.19 et plus, hors nos tests (« Nos tests » ne s’applique pas ici).',
      'Compté la semaine où il arrive, semaine en cours comprise : il peut venir d’une acceptation d’une semaine précédente. Le pourcentage rapproche deux chiffres de la même période, ce n’est pas un suivi des mêmes personnes.',
      'Masqué si la période compte moins de 10 acceptations en 1.4.19 et plus, ou si l’une de ses semaines en compte moins de 10, pour ne reconnaître personne.'],
    actifs: ['Nombre moyen d’installations qui ont ouvert Pilou chaque jour, selon RevenueCat.',
      'Nos téléphones de test sont dedans.',
      '« Provisoire » : un jour n’a pas encore été relu en entier.'],
    habitues: ['Personnes déjà vues les jours précédents qui ouvrent Pilou, en moyenne par jour, selon RevenueCat (actifs moins nouveaux). Nos téléphones de test sont dedans.',
      '« Provisoire » : un jour n’est pas entièrement relu.'],
    jours122: ['Versions 1.4.22 et plus, hors nos tests : un message par jour et par installation qui ouvre Pilou (doublon rare si une réponse se perd). Ce ne sont pas des personnes : une installation ouverte 5 jours compte 5.',
      'Total de la période, semaine en cours comprise. Ne pas comparer au chiffre du dessus (RevenueCat), qui compte toutes les versions et nos tests.'],
    reviennent: ['Nouveaux qui rouvrent Pilou après leur premier jour : le lendemain, du 2ᵉ au 7ᵉ jour, du 8ᵉ au 30ᵉ jour. Comptés la semaine où la base reçoit le retour, semaine en cours comprise. Les trois lignes ne s’additionnent pas.',
      'Le pourcentage porte sur les 4 dernières semaines complètes, décalées pour laisser aux retours le temps d’arriver ; il faut au moins 10 nouveaux.',
      'Les retours arrivent avec retard : chiffre prudent.'],
    abonnes: ['Abonnés qui paient en ce moment, selon RevenueCat, quelle que soit la période choisie.',
      'Compté en production, hors essais, comme dans la console détaillée.'],
    net: ['Ce que Google et Apple vous doivent pour le mois, après TVA et leur part, remboursements déduits.',
      'Pas encore sur votre compte : ils versent plus tard. Avant vos cotisations et impôts.',
      'Jours comptés en heure universelle.'],
    scan: ['Vu par le téléphone, en direct, semaine en cours comprise, hors nos tests (« Nos tests » ne s’applique pas ici). Des essais, pas des personnes : quelqu’un qui recommence compte deux fois.',
      'Scans lancés et listes reçues : toutes versions. Photo annulée (appareil photo ou choix d’une image refermé sans photo), liste enregistrée, liste corrigée (parmi les enregistrées) et saisie à la main : versions 1.4.22 et plus seulement, donc sous-estimées tant que des téléphones restent sur une version plus ancienne.',
      'Pourcentages : part des scans lancés (liste corrigée : part des listes enregistrées). Pas de pourcentage sous 10. « — » : rien de reçu, zéro ou pas encore mesuré.'],
    serveur: ['Compté par le serveur : listes rendues en moins d’une minute, sur les envois à l’analyse. Nos essais sont dedans.',
      'Ne pas l’additionner avec les lignes du dessus : ce n’est pas la même façon de compter.',
      'Un chiffre bas ne prouve pas un abandon.'],
    officines: ['Personnes qui ont obtenu leur accès offert avec le code d’un apporteur, depuis le début (24 mois au plus), quelle que soit la période.',
      '« A payé » : au moins un vrai paiement après l’activation.',
      'Nos propres tests ne sont jamais dans ces chiffres.'],
    direct: ['Les chiffres du jour et de la veille, sans attendre la fin de la semaine.'],
    actions: ['« Actualiser » demande à la console détaillée de collecter les chiffres de RevenueCat (au plus une fois par heure), puis relit le tableau.',
      '« Sauvegarder » lui fait produire le fichier de sauvegarde de la base et le remet à votre navigateur ; une ligne de journal est écrite. La page ne voit pas votre disque : vérifiez le fichier dans vos Téléchargements, avec son empreinte.',
      'Couleur et échéance : celles de la console détaillée (collecte au plus tous les 28 jours, sauvegarde au plus tous les 8 jours).'],
    tests: ['Allumé : nos téléphones de test sont comptés dans les chiffres mesurés par l’application, sauf ceux marqués « hors tests » et l’historique, qui ne les comptent jamais.',
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
