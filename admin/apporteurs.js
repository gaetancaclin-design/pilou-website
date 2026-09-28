/* ============================================================================
 * CONSOLE PILOU — CANAL OFFICINE ET APPORTEURS (lot V3 de la console v2, 28/09/2026)
 * ============================================================================
 * Fichier À PART : `index.html` ne grossit plus (cliquet de la console, V0).
 * ES5 strict, aucune dépendance, aucune requête réseau. N'expose qu'un objet :
 * `window.PilouApporteurs`. Les outils de la page arrivent en paramètre (`o`).
 *
 * Deux parties :
 *  1. `officine` : le tableau « argent réellement encaissé par code ». Son corps
 *     est RECOPIÉ À L'IDENTIQUE depuis index.html (commit 5c413bf, fonction
 *     `rendreOfficine`) ; seul l'emballage change.
 *  2. NOUVEAU (demande de Gaétan, 28/09) : par apporteur et par téléphone,
 *     combien de personnes ont activé un code, combien sont encore dans leur
 *     accès offert, combien l'ont terminé, et combien ont payé ensuite. Calculé
 *     EN BASE par `v_admin_apporteurs_cohorte`, avec le MÊME rattachement des
 *     paiements que les commissions (`v_admin_commissions_mois`).
 *
 * ⚠️ MIEUX VAUT RIEN QU'UN CHIFFRE FAUX : une ligne illisible rend la tuile et
 * le bloc illisibles ; aucun taux sous 10 offres terminées ; jamais un zéro
 * inventé (`entierOuNul`, jamais `Number(x) || 0`).
 * ========================================================================== */
(function(){
  'use strict';

  // Un peu de style, injecté une fois : `index.html` ne grossit pas (même
  // méthode que c3-revenus.js). Cartes d'au moins 300 px : une par ligne sur
  // téléphone, côte à côte sur ordinateur.
  (function style(){
    if(typeof document === 'undefined' || document.getElementById('apporteurs-style')) return;
    var st = document.createElement('style'); st.id = 'apporteurs-style';
    st.textContent = '.coh-grille{display:grid;gap:12px;margin:8px 0 12px;'
      + 'grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}';
    document.head.appendChild(st);
  })();


  // ════ 1. Argent réellement encaissé par code (déplacé tel quel) ════════════
  // ── CE QUE LE CANAL OFFICINE A REELLEMENT RAPPORTE ────────────────────────
  //
  // ⚠️ CETTE VUE NE CALCULE AUCUNE COMMISSION, et ce tableau non plus. Ni taux
  // ni plafond ne sont stockes a ce jour, et la regle de remuneration n'est pas
  // arretee. On mesure l'ASSIETTE : l'argent reel entre par un code.
  //
  // ⚠️ LE NET, PAS LE BRUT. La colonne « net » vient de `net_encaisse()`, qui
  // a remplace `net_estime()` le 13/09 : l'ancienne divisait par (1+taxe) au
  // lieu de soustraire et surestimait de 5,9 % — 2,2415 € au lieu de 2,1163 €
  // sur le paiement du 12/09. Gaetan l'a vue en comparant a Google Play, qui
  // annonce « revenu estime 2,12 € » pour cette commande. Une ligne dont un
  // taux manque n'a PAS de net : elle est comptee dans la derniere colonne.
  //
  // ⚠️ ON N'ADDITIONNE PAS LES DEVISES : une ligne par devise, comme la vue.
  function rendreOfficine(rows, resume, o){
    // Outils de la page, sous leur nom d'origine : le corps ci-dessous est
    // celui de index.html, mot pour mot.
    var $ = o.$, MOT_INTERNES = o.MOT_INTERNES, U_ENCAISSE = o.U_ENCAISSE,
        entierOuNul = o.entierOuNul, mentionPerimetre = o.mentionPerimetre,
        moisTexte = o.moisTexte, montantTexte = o.montantTexte, nb = o.nb,
        sansNosTests = o.sansNosTests, tableau = o.tableau;

    var toutes = rows || [];
    var lignes = sansNosTests(toutes).map(function(r){
      return { cases:[
        {texte: moisTexte(r.mois)},
        {texte: r.apporteur || '—'},
        {texte: r.code || '—'},
        {texte: nb(r.encaissements)},
        {texte: nb(r.abonnes)},
        {texte: (r.brut == null) ? '—' : montantTexte(Number(r.brut), r.devise)},
        {texte: (r.net  == null) ? '—' : montantTexte(Number(r.net), r.devise)},
        {texte: nb(r.encaissements_sans_net),
         classe: (Number(r.encaissements_sans_net) > 0) ? 'attention' : 'vide'}
      ]};
    });
    // ⚠️ UN TABLEAU VIDE NE DIT PAS POURQUOI IL EST VIDE, et il y a deux
    // « vides » tres differents ici : aucun client payant du tout, ou des
    // clients payants dont AUCUN n'entre par un code. Le second est le seul
    // qui compte pour remunerer un apporteur. Le chiffre est LU dans le
    // resume ; il n'est jamais ecrit en dur (c'est le defaut du 13/09).
    // On ne parle que si la base a rendu zero ligne : si c'est l'interrupteur
    // qui a vide le tableau, c'est la mention de perimetre qui le dit.
    // ⚠️ ON ENONCE DES MESURES, ON NE CONCLUT RIEN. « Il n'y a rien a
    // commissionner », puis « aucun encaissement n'est rattache a un code »,
    // etaient deux deductions tirees d'une ABSENCE de lignes : un code
    // supprime, un apporteur efface ou une jointure changee donnent le meme
    // vide. Cette page ecrit elle-meme, plus haut, que « l'absence de donnees
    // n'est pas une absence de probleme ». Il ne reste donc que des faits :
    // zero ligne rendue, N payants dans la MEME lecture (deux requetes d'un
    // meme `Promise.all` : la meme lecture, pas le meme instant), et la regle
    // d'appartenance a ce tableau.
    //
    // ⚠️ ET `entierOuNul`, JAMAIS `Number`. `Number(null)` vaut ZERO : la
    // version precedente affirmait « aucun client payant a ce jour » au moment
    // meme ou la tuile du haut affichait « — » faute d'avoir pu lire.
    var faitVide = '';
    if(toutes.length === 0){
      var payants = resume ? entierOuNul(resume.clients_payants) : null;
      faitVide = '<div class="rien">La vue n’a rendu <b>aucune ligne</b>. '
        + (payants === null
            ? '<b>Le nombre de clients payants n’a pas pu être lu</b> : ce tableau '
              + 'vide ne permet alors aucune conclusion.'
            : 'Dans la même lecture, le résumé compte <b>' + payants + '</b> '
              + 'client(s) payant(s) en production, tous canaux confondus.')
        + ' Un encaissement n’apparaît dans ce tableau que s’il est rattaché à un '
        + 'code : <b>une absence de ligne ne prouve pas</b>, à elle seule, qu’aucun '
        + 'paiement n’est passé par un code.</div>';
    }
    $('cadre-officine').innerHTML = tableau(
      'Canal officine — argent réellement encaissé par code',
      ['Mois','Apporteur','Code','Encaissements','Abonnés','Brut','Net encaissé','Sans net'],
      lignes,
      'aucun encaissement rattaché à un code', 12)
      + mentionPerimetre(toutes, MOT_INTERNES, U_ENCAISSE)
      + faitVide
      + '<div class="rien"><b>Ce tableau ne calcule aucune commission</b> : elles sont dans '
      + '« À verser aux apporteurs », section Argent. Il montre l’assiette — l’argent réel '
      + 'entré par un code, rattaché par installation seulement et en mois de Paris : il peut différer des commissions.<br><br>Le <b>net</b> est le brut moins la TVA et '
      + 'moins la part du magasin, aux taux que RevenueCat envoie <b>avec chaque paiement</b> '
      + '— rien n’est figé dans la page. La colonne « sans net » compte les encaissements '
      + 'dont un taux manquait : ils ne sont pas perdus, ils ne sont simplement pas '
      + 'chiffrables.<br><br>⚠️ Le « revenu estimé » de Google reste une <b>estimation</b> : '
      + 'le versement réel arrive sur le relevé mensuel, après conversions et remboursements. '
      + 'Avant de payer une commission, rapprochez ce total de ce relevé.</div>';
  }

  // ════ 2. Cohortes par apporteur (nouveau) ══════════════════════════════
  var CHAMPS = ['accordes','en_cours','terminees','sans_fin','payeurs','payeurs_pendant_offre',
                'payeurs_apres_offre','payeurs_parmi_terminees','echecs','en_attente'];
  var TELEPHONE = { android:'Android', ios:'iPhone' };
  var PLANCHER_TAUX = 10;
  var LIMITE_TUILE = 'Depuis le début (dans la limite des 24 mois de conservation), quelle que soit '
    + 'la période choisie. Une personne = une '
    + 'installation de Pilou qui a obtenu son accès offert avec un code de cet apporteur : '
    + 'code saisi dans Pilou sur Android, offre Apple échangée et rattachée sur iPhone. '
    + '« A payé » = au moins un vrai paiement (production, hors partage familial) après '
    + 'l’activation, rattaché comme pour les commissions. Nos propres tests ne sont jamais '
    + 'dans ces tuiles.';

  // Une ligne est lisible si tous ses comptes sont des entiers >= 0 et si son
  // téléphone est connu. Sinon : null, et l'appelant n'affiche AUCUN chiffre.
  function ligneLue(r, o){
    if(!r || typeof r !== 'object' || !TELEPHONE.hasOwnProperty(r.plateforme)) return null;
    if(typeof r.apporteur !== 'string' || r.apporteur === '' || typeof r.interne !== 'boolean') return null;
    var out = { apporteur:r.apporteur, apporteur_id:r.apporteur_id, interne:r.interne,
                actif:(r.actif !== false), plateforme:r.plateforme, prochaine_fin:r.prochaine_fin };
    for(var i = 0; i < CHAMPS.length; i++){
      var v = o.entierOuNul(r[CHAMPS[i]]);
      if(v === null || v < 0) return null;
      out[CHAMPS[i]] = v;
    }
    // Cohérence : les sous-comptes ne dépassent jamais leur total.
    if(out.en_cours + out.terminees + out.sans_fin !== out.accordes) return null;
    if(out.payeurs > out.accordes || out.payeurs_parmi_terminees > out.terminees
       || out.payeurs_pendant_offre + out.payeurs_apres_offre > out.payeurs) return null;
    return out;
  }

  // Regroupe les lignes par apporteur (Android + iPhone additionnés : mêmes
  // unités, des personnes distinctes par construction — une attribution par
  // installation). Rend null si UNE ligne est illisible.
  function parApporteur(rows, o){
    var ordre = [], par = {};
    for(var i = 0; i < (rows || []).length; i++){
      var l = ligneLue(rows[i], o);
      if(!l) return null;
      var k = String(l.apporteur_id || l.apporteur);
      if(!par[k]){
        par[k] = { apporteur:l.apporteur, interne:l.interne, actif:l.actif, lignes:[], total:{} };
        for(var c = 0; c < CHAMPS.length; c++) par[k].total[CHAMPS[c]] = 0;
        par[k].total.prochaine_fin = null;
        ordre.push(k);
      }
      par[k].lignes.push(l);
      for(var c2 = 0; c2 < CHAMPS.length; c2++) par[k].total[CHAMPS[c2]] += l[CHAMPS[c2]];
      if(l.prochaine_fin && (!par[k].total.prochaine_fin || l.prochaine_fin < par[k].total.prochaine_fin))
        par[k].total.prochaine_fin = l.prochaine_fin;
    }
    ordre.sort(function(a, b){ return par[a].apporteur.localeCompare(par[b].apporteur, 'fr'); });
    return ordre.map(function(k){ return par[k]; });
  }

  function pluriel(n, sing, plur){ return n + ' ' + (n > 1 ? plur : sing); }

  // « Passage au payant » : seulement sur les offres TERMINÉES (une offre en
  // cours n'a pas encore eu l'occasion de devenir payante).
  function passage(t, o){
    if(t.accordes === 0) return '—';
    if(t.terminees === 0){
      return t.prochaine_fin ? 'aucune offre terminée (1re fin le ' + o.jourTexte(String(t.prochaine_fin).slice(0, 10)) + ')'
                             : 'aucune offre terminée';
    }
    var base = t.payeurs_parmi_terminees + '\u00a0sur\u00a0' + t.terminees;   // jamais coupé
    if(t.terminees < PLANCHER_TAUX) return base;
    var f = o.fourchetteMesure(t.payeurs_parmi_terminees, t.terminees);
    var pct = Math.round(1000 * t.payeurs_parmi_terminees / t.terminees) / 10;
    return base + ' — ' + String(pct).replace('.', ',') + ' %'
      + (f ? ' (entre ' + String(f.bas).replace('.', ',') + ' et ' + String(f.haut).replace('.', ',') + ' %)' : '');
  }

  // Tuiles d'accueil : une par apporteur EXTERNE et actif. Rend { html, illisible }.
  function tuiles(rows, o){
    var groupes = parApporteur(rows, o);
    if(groupes === null){
      return { html: o.tuileIllisible('Codes des apporteurs', 'une ligne des cohortes est illisible', LIMITE_TUILE), illisible:true };
    }
    var h = '';
    for(var i = 0; i < groupes.length; i++){
      var g = groupes[i], t = g.total;
      if(g.interne || !g.actif) continue;
      var sous;
      if(t.accordes === 0){
        sous = 'Aucun code activé pour l’instant.';
      } else {
        // Court : la tuile fait 170 px. Le détail est dans « Canal officine ».
        sous = t.en_cours + ' en cours · ' + t.payeurs + (t.payeurs > 1 ? ' ont payé' : ' a payé')
          + ' · offres finies : ' + passage(t, o);
      }
      // « Code de Nico », pas « Pharmacies · Nico » : Nico n'est pas pharmacien,
      // et la vue compte un CODE, pas une officine (revue adverse V3).
      h += o.tuileAccueil({ nom:'Code de ' + g.apporteur, badge:'cumul',
        grand:String(t.accordes), unite:(t.accordes > 1 ? 'personnes' : 'personne'),
        sous:sous, limite:LIMITE_TUILE });
    }
    return { html:h, illisible:false };
  }

  // Le bloc de la section « Canal officine » : UNE CARTE PAR APPORTEUR, pas un
  // tableau. Dix colonnes débordaient dès 1280 px et se coupaient sur
  // téléphone (vu au banc le 28/09) ; une carte se lit partout.
  var AIDE_BLOC = 'Une <b>personne</b> est une installation de Pilou qui a obtenu son accès offert '
    + 'avec un code : saisi dans Pilou sur Android, offre Apple échangée et rattachée sur iPhone. '
    + '« <b>Ont payé</b> » : au moins un vrai paiement (production, hors partage familial) '
    + '<b>après</b> l’activation, rattaché exactement comme pour les commissions ; un paiement '
    + 'remboursé depuis reste compté. « <b>Passage au payant</b> » ne regarde que les offres '
    + '<b>terminées</b> : une offre en cours n’a pas encore eu l’occasion de devenir payante. Sous '
    + PLANCHER_TAUX + ' offres terminées, le nombre seul ; au-delà, le pourcentage et sa fourchette '
    + 'à 95 %.<br><br>⚠️ <b>Ce que ces cartes ne voient pas</b> : quelqu’un qui réinstalle Pilou sur '
    + 'Android change d’identifiant — s’il paie ensuite sans ressaisir son code, son paiement peut '
    + 'ne plus être rattaché (chantier F4 lot C) ; un échange iPhone non rattaché est signalé par le '
    + 'voyant « Codes officine sur iPhone », pas ici. Au-delà de <b>24 mois</b>, le compte n’est plus '
    + 'complet (règles de conservation : un code jamais suivi d’un paiement est effacé à 24 mois, '
    + 'et les pseudonymes des paiements aussi).<br><br>« Codes sans accès » : les <b>échecs des 90 '
    + 'derniers jours</b> (au-delà, ils sont effacés) et les saisies <b>en attente en ce moment</b> '
    + '(une attente de plus de 30 minutes passe en échec) — pas un cumul.';

  function blocCohortes(rows, o){
    var groupes = parApporteur(rows, o);
    if(groupes === null){
      return '<div class="rien avert"><b>Personnes touchées par code : illisible.</b> Une ligne de '
        + '<code>v_admin_apporteurs_cohorte</code> n’est pas un compte cohérent. Aucun chiffre n’est '
        + 'affiché plutôt qu’un chiffre faux.</div>';
    }
    var cartes = '', toutes = [];
    for(var i = 0; i < groupes.length; i++){
      var g = groupes[i], t = g.total;
      toutes.push({ interne:g.interne });
      if(g.interne && !o.compterNosTests()) continue;
      var parTel = {};
      for(var j = 0; j < g.lignes.length; j++) parTel[g.lignes[j].plateforme] = g.lignes[j].accordes;
      var lignes = [
        ['Android', String(parTel.android || 0)],
        ['iPhone', String(parTel.ios || 0)],
        ['En cours', String(t.en_cours)],
        ['Offres terminées', String(t.terminees)],
        ['Ont payé', String(t.payeurs)
          + (t.payeurs ? ' (dont ' + t.payeurs_apres_offre + ' après la fin)' : '')],
        ['Passage au payant', passage(t, o), true]
      ];
      var sansAcces = t.echecs + t.en_attente;
      if(sansAcces > 0){
        lignes.push(['Codes sans accès', (t.echecs ? pluriel(t.echecs, 'échec', 'échecs') + ' (90 j)' : '')
          + (t.echecs && t.en_attente ? ' · ' : '')
          + (t.en_attente ? t.en_attente + ' en attente' : '')]);
      }
      cartes += o.res('Code de ' + g.apporteur + (g.interne ? ' (interne)' : '') + ' · '
        + (t.accordes > 1 ? 'personnes touchées' : 'personne touchée'),
        String(t.accordes), lignes, AIDE_BLOC,
        sansAcces > 0 ? 'attention' : false);
    }
    return '<div class="cap">Personnes touchées par code — depuis le début (24 mois au plus)</div>'
      + (cartes ? '<div class="coh-grille">' + cartes + '</div>'
                : '<div class="rien">Aucun apporteur à afficher.</div>')
      + o.mentionPerimetre(toutes, { sing:'apporteur interne', plur:'apporteurs internes', masculin:true });
  }

  // Le bloc des personnes touchées passe EN TÊTE de la section « Canal
  // officine », avant les codes : c'est la question que Gaétan pose d'abord.
  // Son cadre est créé une fois (sans toucher index.html), puis réécrit à
  // chaque rendu — jamais dupliqué.
  function officine(rows, resume, cohorte, o){
    rendreOfficine(rows, resume, o);
    var cadre = o.$('cadre-cohortes');
    if(!cadre){
      o.$('cadre-codes').insertAdjacentHTML('beforebegin', '<div class="cadre" id="cadre-cohortes"></div>');
      cadre = o.$('cadre-cohortes');
    }
    cadre.innerHTML = blocCohortes(cohorte, o);
  }

  window.PilouApporteurs = { officine:officine, tuiles:tuiles };
})();
