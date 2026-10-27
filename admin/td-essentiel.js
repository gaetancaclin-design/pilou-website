/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.6) — « LE PARCOURS » EN 7 ÉTAPES
 * ============================================================================
 * Maquette « L'essentiel » validée par Gaétan le 26/10 ; plan v3 relu en
 * adverse le 27/10 (3 bloquants intégrés) : un chiffre que la page montre DÉJÀ
 * est calculé ICI EXACTEMENT comme sa carte (mêmes fonctions, mêmes règles) —
 * « Nouveaux utilisateurs », « Pilulier créé » (masqué sous 10), « Rouvrent
 * Pilou », « Abonnés Pilou+ » ; les chiffres NOUVEAUX viennent des vues lues
 * après le premier affichage (`suite`, td-donnees.js) : feuille des conditions,
 * premier essai, rappels autorisés, chemin des rappels (1.4.36), Pilou+.
 * Le banc vérifie l'égalité avec les cartes sur chaque semaine.
 * RÈGLES : chaque chiffre dit son unité ; aucun taux entre deux unités ;
 * illisible → « — » rouge, compté ; rien → « — » gris ; aucune requête.
 * `rendre` ne lève JAMAIS. ES5 strict. Expose `TDEssentiel`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, P = racine.TDPeriode, B = racine.TDBulles, E = racine.TDEssentielCalc;
  function ech(s){ return C.ech(s); }
  // Semaine où le chiffre « rappels autorisés » devient fiable (étude du 26/10).
  var RAPPELS_FIABLES = '2026-10-26';

  // ── Petits morceaux de rendu ───────────────────────────────────────────────
  function grand(v, unite, cl){
    return '<div class="es-g' + (cl ? ' ' + cl : '') + '"><b>' + ech(v) + '</b>' + (unite ? '<span>' + ech(unite) + '</span>' : '') + '</div>';
  }
  // `nouveau` : chiffre propre à ce bloc, compté dans « chiffres non lus » ; un chiffre
  // repris d'une carte n'est pas compté deux fois (la carte le compte déjà).
  function ko(x, cause, nouveau){ if(nouveau) x.illisibles++; return { droite:grand('—', 'non lu', 'es-ko'), notes:['Non lu : ' + cause + '. N’en concluez rien.'], ko:true }; }
  function gris(texte){ return { droite:grand('—', '', 'es-vide'), notes:[texte] }; }
  function puce(t){ return '<span class="es-puce">' + ech(t) + '</span>'; }
  function etape(n, titre, aide, r){
    return '<div class="es-m' + (r.ko ? ' es-mko' : '') + '"><div class="es-n">' + n + '</div><div class="es-c"><div class="es-t">' + ech(titre)
      + B.aide(titre, aide) + '</div>' + (r.detail ? '<div class="es-d">' + r.detail + '</div>' : '')
      + (r.puces && r.puces.length ? '<div class="es-p">' + r.puces.join('') + '</div>' : '')
      + (r.notes && r.notes.length ? '<div class="es-x">' + r.notes.map(ech).join('<br>') + '</div>' : '')
      + (r.plus || '') + '</div><div class="es-r">' + (r.droite || '') + (r.petit ? '<small>' + ech(r.petit) + '</small>' : '') + '</div></div>';
  }
  function fois(n){ return n + ' fois'; }
  // Volet « chemin des rappels » : son état ouvert survit aux redessins (revue m3).
  var detOuvert = false;
  if(racine.document) racine.document.addEventListener('toggle', function(e){
    if(e.target && e.target.classList && e.target.classList.contains('es-det')) detOuvert = e.target.open;
  }, true);
  function chargement(){ return gris('chargement…'); }

  // Semaines de mesure lisibles (même règle que la fonction `lues` de td-cartes.js).
  function lues(x){
    var s = P.semainesMesure(x.a.parSemaine, x.J, x.p, x.premiere);
    if(s.hors) s.message = 'Trop ancien, plus conservé';
    else if(s.absente !== null) s.message = (x.p.enCours && s.absente === x.p.fin) ? 'Pas encore de chiffre cette semaine' : 'Pas de chiffre pour cette période';
    else if(!s.lues.length) s.message = 'Pas encore mesuré à cette date';
    return s;
  }
  // Compteurs des versions récentes (v4 + v5), mis en cache par rendu.
  // Une panne des vues v4/v5 n'est comptée qu'une fois dans « chiffres non lus » (revue m1).
  function koRecents(x){ if(!x.ess45Compte){ x.ess45Compte = true; x.illisibles++; } }
  function recents(x){
    if(x.ess45) return x.ess45;
    var su = x.suite;
    if(!su) return (x.ess45 = { attente:true });
    return (x.ess45 = E.sommesCles([su.mesureV4, su.mesureV5], x.p.semaines, x.avecTest));
  }
  function entonnoir(x){ return x.ent || (x.ent = racine.TDPilotage ? racine.TDPilotage.semaines(x.d.pilotage) : { cause:'le fichier td-pilotage.js n’a pas été chargé' }); }

  // ── 1. Arrivent (RevenueCat ; = « sur … ouvertures » de la carte Nouveaux) ──
  function arrivent(x){
    if(!x.d.audMesures || !x.d.audMesures.length) return gris('Aucune série RevenueCat archivée');
    if(!C.audienceLibellesConformes(x.d.audMesures)) return gris('Non affiché : les séries RevenueCat ont changé de nom');
    var a = P.audience(x.d.audJours, x.p.jours, 'nouveaux');
    if(a.cause) return ko(x, a.cause);
    if(!a.lus) return gris('Pas encore relevé chez RevenueCat');
    var p = [];
    if(a.provisoire) p.push(puce('provisoire'));
    if(a.lus < a.sur && !x.p.enCours) p.push(puce(a.lus + ' jours sur ' + a.sur));
    return { droite:grand(String(a.somme), a.somme > 1 ? 'installations' : 'installation'), petit:'tests inclus',
      detail:'Installations ouvertes pour la première fois (RevenueCat)', puces:p };
  }

  // ── 2. Acceptent (= carte Nouveaux utilisateurs) + feuille des conditions ───
  function acceptent(x){
    if(x.a.cause) return ko(x, x.a.cause);
    var s = lues(x);
    if(s.message) return gris(s.message);
    var t = P.somme(x.cases, s.lues, 'jalon_accueil'), web = P.somme(x.cases, s.lues, 'jalon_accueil', 'web');
    var r = { droite:grand(String(t), t > 1 ? 'acceptations' : 'acceptation'), petit:x.avecTest ? 'nos tests comptés' : 'hors tests',
      puces:[puce('Android ' + P.somme(x.cases, s.lues, 'jalon_accueil', 'and')), puce('iPhone ' + P.somme(x.cases, s.lues, 'jalon_accueil', 'ios'))]
        .concat(web ? [puce('Navigateur ' + web)] : [])
        .concat(s.avant && s.lues.length ? [puce('mesuré sur ' + s.lues.length + ' semaine' + (s.lues.length > 1 ? 's' : '') + ' sur ' + x.p.semaines.length)] : []) };
    var k = recents(x);
    if(k.attente) r.detail = 'Feuille des conditions : chargement…';
    else if(k.cause){ koRecents(x); r.detail = '<span class="es-rouge">Feuille des conditions non lue (' + ech(k.cause) + ')</span>'; }
    else if(!(k.vues[0] + k.vues[1])) r.detail = ech('Feuille des conditions : pas encore mesurée sur cette période (1.4.32 et plus)');
    else r.detail = ech('Feuille des conditions (1.4.32 et plus) : montrée ' + fois(E.val(k, 'conditions_feuille_affichee'))
      + ' · acceptée ' + fois(E.val(k, 'conditions_acceptees')) + ' · fermée sans accepter ' + fois(E.val(k, 'conditions_pas_maintenant')));
    return r;
  }

  // ── 3. Premier essai (blocs, v_admin_essais) ────────────────────────────────
  function essai(x){
    if(!x.suite) return chargement();
    var e = E.essais(x.suite.essais, x.p.debut, x.p.dimanche);
    if(e.cause) return ko(x, e.cause, true);
    if(!e.blocs.length) return gris(x.p.enCours ? 'Semaine en cours : comptée quand son bloc sera fermé' : 'Pas de bloc fermé pour cette période');
    var lignes = e.blocs.map(function(b){
      return 'du ' + P.jj_mm(b.debut) + ' au ' + P.jj_mm(b.dimanche) + ' : ' + b.n + ' (scan ' + b.scan + ' · à la main ' + b.saisie + ')';
    });
    return { droite: e.blocs.length === 1 ? grand(String(e.blocs[0].n), 'premiers essais, tout le bloc') : grand('—', 'plusieurs blocs', 'es-vide'),
      petit:'hors tests · 1.4.34 et plus', detail:ech('Bloc ' + lignes.join(' ; bloc ')) };
  }

  // ── 4. Créent (= carte Pilulier créé, masquage sous 10 compris) ─────────────
  function creent(x){
    var e = entonnoir(x);
    if(e.cause) return ko(x, e.cause);
    var T = racine.TDPilotage, num = T.somme(e, x.p.semaines, 'premiers_traitements'), den = T.somme(e, x.p.semaines, 'acceptations_v2');
    if(num.ko || den.ko) return ko(x, 'valeur illisible dans la vue de l’historique');
    if(num.hors || den.hors) return gris('Trop ancien, plus conservé');
    if(den.v === null && num.v === null) return gris(x.p.enCours ? 'Pas encore de chiffre cette semaine' : 'Pas de chiffre pour cette période');
    if(num.masque || den.v === null || den.v < C.MESURE_PLANCHER) return gris('Moins de 10 acceptations sur une semaine : chiffre masqué');
    if(num.v === null) return { droite:grand('—', '', 'es-vide'), petit:'hors tests', detail:ech('Aucun premier traitement reçu · sur ' + den.v + ' acceptations en 1.4.19 et plus') };
    var n = num.v;
    return { droite:grand(String(n), n > 1 ? 'piluliers' : 'pilulier'), petit:'hors tests',
      detail:ech((n <= den.v ? 'soit ' + P.pctEntier(n, den.v) + ' ' : '') + 'sur ' + den.v + ' acceptations en 1.4.19 et plus, même période') };
  }

  // ── 5. Rappels autorisés (1.4.34 et plus) + chemin des rappels (1.4.36) ─────
  function rappels(x){
    var e = entonnoir(x), sem = x.p.fin, r;
    if(e.cause) r = ko(x, e.cause);
    else if(sem < RAPPELS_FIABLES) r = gris('Non mesuré de façon fiable avant la semaine du ' + P.jj_mm(RAPPELS_FIABLES));
    else {
      var a = E.colonne(e, [sem], 'presentes_traitement_avec_rappels'), t = E.colonne(e, [sem], 'presentes_avec_traitement');
      if(a.ko || t.ko) r = ko(x, 'valeur illisible dans la vue de l’historique', true);
      else if(a.hors || t.hors) r = gris('Pas de ligne pour cette semaine');
      else if(t.v === null) r = gris(x.p.enCours ? 'Pas encore de chiffre cette semaine' : 'Rien reçu cette semaine');
      else {
        var av = a.v || 0, pc = E.pct(av, t.v, x.p.enCours);
        r = { droite:grand(av + ' sur ' + t.v, 'installations'), petit: pc !== null ? 'soit ' + pc + ' %' : (x.p.enCours ? 'semaine en cours' : 'trop peu pour un %'),
          detail:ech('Notifications autorisées, parmi les installations qui ont un traitement en cours avec rappels' + (x.p.mode === '4sem' ? ' (dernière semaine de la période)' : '')) };
      }
    }
    r.plus = chemin(x);
    return r;
  }
  var GROUPES = [
    ['Écran « Recevez vos rappels »', [['vu', 'rappels_explication_vue'], ['« Activer »', 'rappels_explication_activer'], ['« Plus tard »', 'rappels_explication_plus_tard']]],
    ['Fenêtre du téléphone, après cet écran', [['accordée', 'rappels_accordes'], ['non accordée', 'rappels_non_accordes']]],
    ['Fenêtre du téléphone, sans cet écran', [['accordée', 'rappels_sans_explication_accordes'], ['non accordée', 'rappels_sans_explication_non_accordes']]],
    ['Bandeau « Activer les rappels »', [['touché', 'rappels_bandeau_activer']]],
    ['Rappels bloqués', [['« Ouvrir les réglages »', 'rappels_bloques_reglages'], ['rétablis au retour', 'rappels_retablis']]],
    ['Android, alarmes à l’heure exacte', [['écran vu', 'alarmes_explication_vue'], ['« Autoriser »', 'alarmes_autoriser'], ['accordées', 'alarmes_accordees']]]
  ];
  function chemin(x){
    var k = recents(x), h = '<details class="es-det"' + (detOuvert ? ' open' : '') + '><summary>Chemin d’activation des rappels (1.4.36)</summary>'
      + '<div class="es-x">Ce que c’est' + B.aide('Chemin d’activation des rappels', 'essRf5') + '</div>';
    if(k.attente) return h + '<div class="es-x">chargement…</div></details>';
    if(k.cause){ koRecents(x); return h + '<div class="es-x es-rouge">' + ech('Non lu : ' + k.cause + '. N’en concluez rien.') + '</div></details>'; }
    if(!k.vues[1]) return h + '<div class="es-x">' + ech('Pas encore mesuré sur cette période (versions 1.4.34 et plus).') + '</div></details>';
    var total = 0, i, j;
    for(i = 0; i < E.RF5.length; i++) total += E.val(k, E.RF5[i]);
    h += '<table class="es-tab"><tbody>';
    for(i = 0; i < GROUPES.length; i++){
      var g = GROUPES[i], cells = [];
      for(j = 0; j < g[1].length; j++) cells.push(ech(g[1][j][0]) + ' <b>' + (total ? E.val(k, g[1][j][1]) : '—') + '</b>');
      h += '<tr><th scope="row">' + ech(g[0]) + '</th><td>' + cells.join(' · ') + '</td></tr>';
    }
    h += '</tbody></table><div class="es-x">' + ech(total === 0
      ? 'Rien reçu pour cette période : ces compteurs existent depuis la version 1.4.36 (ou ils ont été coupés côté serveur).'
      : 'En « fois », ' + (x.avecTest ? 'nos tests comptés' : 'hors tests') + ' ; aucun taux entre ces lignes.') + '</div></details>';
    return h;
  }

  // ── 6. Reviennent (= nombres de la carte Rouvrent Pilou) ────────────────────
  function reviennent(x){
    if(x.a.cause) return ko(x, x.a.cause);
    var s = lues(x);
    if(s.message) return gris(s.message);
    var j1 = P.somme(x.cases, s.lues, 'jalon_revenu_j1');
    return { droite:grand(String(j1), j1 > 1 ? 'retours le lendemain' : 'retour le lendemain'), petit:x.avecTest ? 'nos tests comptés' : 'hors tests',
      detail:ech('du 2ᵉ au 7ᵉ jour ' + P.somme(x.cases, s.lues, 'jalon_revenu_j2_7') + ' · du 8ᵉ au 30ᵉ jour ' + P.somme(x.cases, s.lues, 'jalon_revenu_j8_30')
        + ' · retours reçus pendant la période ; pourcentage : carte « Rouvrent Pilou »') };
  }

  // ── 7. Pilou+ (gestes 1.4.34 et plus) + abonnés (= carte Abonnés Pilou+) ────
  function abonnesTexte(x){
    var r = x.d.resume;
    if(!r) return null;
    var n = C.entierOuNul(r.clients_payants), ao = C.entierOuNul(r.acces_offerts_en_cours);
    if(n === null || ao === null) return null;
    var marque = ('acces_offerts_en_cours_internes' in r) && ('acces_offerts_total_internes' in r);
    var internes = marque ? C.entierOuNul(r.acces_offerts_en_cours_internes) : 0;
    if(internes === null) return null;
    var aff = (marque && !x.avecTest) ? ao - internes : ao;
    if(aff < 0) return null;
    return 'Abonnés en ce moment : ' + n + (n > 1 ? ' payants' : ' payant') + ' + ' + aff + (aff > 1 ? ' accès offerts' : ' accès offert')
      + ((!marque && !x.avecTest) ? ' (nos accès internes n’ont pas pu être séparés)' : '');
  }
  function pilouPlus(x){
    var k = recents(x), ab = abonnesTexte(x), r;
    if(k.attente) r = chargement();
    else if(k.cause){ koRecents(x); r = ko(x, k.cause, false); }
    else if(!k.vues[1]) r = gris('Pas encore mesuré sur cette période (versions 1.4.34 et plus)');
    else {
      var f = E.val(k, 'paywall_limite') + E.val(k, 'paywall_fonction') + E.val(k, 'paywall_historique');
      r = { droite:grand(String(f), 'fois'), petit:'feuille Pilou+ ouverte',
        puces:[puce('limite atteinte ' + E.val(k, 'paywall_limite')), puce('fonction réservée ' + E.val(k, 'paywall_fonction')),
          puce('historique ' + E.val(k, 'paywall_historique')), puce('« Découvrir » touché ' + E.val(k, 'paywall_decouvrir'))],
        detail:ech('Achats lancés ' + E.val(k, 'achat_lance') + ' · annulés ' + E.val(k, 'achat_annule') + ' · autres ' + E.val(k, 'achat_autre')
          + ' · écran Pilou+ ouvert depuis une offre ' + E.val(k, 'abonnement_depuis_offre') + ' (gestes, 1.4.34 et plus, ' + (x.avecTest ? 'nos tests comptés' : 'hors tests') + ')') };
    }
    r.notes = (r.notes || []).concat([ab === null ? 'Abonnés : voir la carte « Abonnés Pilou+ »' : ab, 'L’argent : carte « Net » plus bas']);
    return r;
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  // x : contexte de td-app.js (d, J, p, avecTest, a, cases, premiere, illisibles) ; suite : vues lues après coup.
  function rendre(x, suite){
    try {
      var y = { d:x.d, J:x.J, p:x.p, avecTest:x.avecTest, a:x.a, cases:x.cases, premiere:x.premiere, suite:suite, illisibles:0 };
      var h = '<div class="es-tete"><div><h2>Le parcours' + B.aide('Le parcours', 'essParcours') + '</h2><div class="es-sous">'
        + ech('De l’installation à Pilou+ · ' + (x.p.mode === '4sem' ? 'les 4 semaines choisies' : (x.p.enCours ? 'semaine en cours, nombres seuls' : 'semaine du ' + P.jj_mm(x.p.fin))))
        + '</div></div></div>'
        + etape(1, 'Arrivent', 'essArrivent', arrivent(y))
        + etape(2, 'Acceptent les conditions', 'essAcceptent', acceptent(y))
        + etape(3, 'Font un premier essai', 'essEssai', essai(y))
        + etape(4, 'Créent leur pilulier', 'essCreent', creent(y))
        + etape(5, 'Rappels autorisés', 'essRappels', rappels(y))
        + etape(6, 'Reviennent', 'essReviennent', reviennent(y))
        + etape(7, 'Pilou+', 'essPilouPlus', pilouPlus(y));
      return { html:h, illisibles:y.illisibles };
    } catch(err){
      if(racine.console) racine.console.error('parcours :', err);
      return { html:'<div class="message ko"><b>Non affiché.</b> ' + ech('Cette page n’a pas su afficher « Le parcours » ('
        + (err && err.message ? err.message : err) + '). C’est un défaut de la page, pas de la base ; le reste du tableau de bord n’est pas concerné.') + '</div>', illisibles:1 };
    }
  }

  racine.TDEssentiel = { rendre:rendre, RAPPELS_FIABLES:RAPPELS_FIABLES, GROUPES:GROUPES };
})(window);
