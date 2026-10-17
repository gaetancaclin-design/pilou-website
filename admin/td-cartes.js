/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.3) — LES CARTES
 * ============================================================================
 * Quatre questions (arrivent, s'en servent, reviennent, rapportent), puis le
 * scan d'ordonnance et les officines. Chaque carte reçoit le contexte `x` :
 *   { d (vues lues), J (jour de la base), p / prev (période et précédente),
 *     avecTest, a (agregerMesure), cases (par semaine/clé/plateforme),
 *     ach (agrégat de v_admin_mesure_charge) }.
 * V4.3 (17/10) : tout est lu EN DIRECT, semaine en cours comprise. « Pilulier
 * créé », « Scan d'ordonnance » et la ligne « jours d'utilisation » lisent
 * `v_admin_entonnoir_semaine` (td-pilotage.js), seule vue déjà chargée qui
 * rend ces clés pour la semaine en cours et pour toutes les versions ; elle
 * est hors tests : « Nos tests » ne s'y applique pas (étiquette « hors tests »).
 * RÈGLES : toute donnée passe par `ech` ; illisible → « — » rouge, jamais 0 ;
 * absent → « — » gris qui dit pourquoi ; vert/orange/rouge réservés aux
 * pastilles d'état ; flèches de tendance neutres ; semaine en cours : pas
 * de flèche (une semaine partielle ne se compare pas à une semaine pleine). ES5 strict. Expose `TDCartes`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, P = racine.TDPeriode, B = racine.TDBulles;
  function ech(s){ return C.ech(s); }

  function chip(cl, t){
    return '<span class="chip ' + cl + '">' + (cl !== 'gris' ? '<span class="pt"></span>' : '') + ech(t) + '</span>';
  }
  function arrondi(v){ return v >= 10 ? String(Math.round(v)) : C.unDecimal(v); }
  function courbe(v){
    if(!v || v.length < 2) return '';
    var mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), r = (mx - mn) || 1, pts = [];
    for(var k = 0; k < v.length; k++) pts.push((4 + k * 108 / (v.length - 1)).toFixed(1) + ',' + (30 - (v[k] - mn) / r * 26).toFixed(1));
    var der = pts[pts.length - 1].split(',');
    return '<svg class="spark" viewBox="0 0 120 34" role="img" aria-label="Moyenne par jour, ' + v.length
      + ' dernières semaines"><polyline fill="none" stroke="currentColor" stroke-width="2.2" '
      + 'stroke-linecap="round" stroke-linejoin="round" points="' + pts.join(' ') + '"/><circle cx="' + der[0]
      + '" cy="' + der[1] + '" r="3.2" fill="currentColor"/></svg>';
  }
  function libPrec(x){ return x.p.mode === '4sem' ? '4 sem. préc.' : 'sem. préc.'; }
  function tend(v, ref, x){
    if(v.petit) return chip('gris', 'Petit nombre · ' + libPrec(x) + ' : ' + ref);
    return '<span class="tend">' + ech(v.f + ' ' + v.t + ' vs ' + libPrec(x) + ' (' + ref + ')') + '</span>'; }
  function precNonMesuree(x){ return x.p.mode === '4sem' ? '4 semaines précédentes non mesurées' : 'Semaine précédente non mesurée'; }

  // o = { nom, aide, extra, tag, classe, grand, unite, sous, ligne (HTML déjà échappé), pied:[], courbe, corps }
  function carte(o){
    var pied = (o.pied || []).join('') + (o.courbe || '');
    return '<div class="c' + (o.classe ? ' ' + o.classe : '') + '"><div class="k-tete">' + ech(o.nom)
      + B.aide(o.nom, o.aide, o.extra) + (o.tag ? '<span class="tag">' + ech(o.tag) + '</span>' : '') + '</div>'
      + (o.corps || ('<div class="k-val"><b>' + ech(o.grand) + '</b>' + (o.unite ? '<span>' + ech(o.unite) + '</span>' : '') + '</div>'))
      + (o.sous ? '<div class="k-sous">' + ech(o.sous) + '</div>' : '') + (o.ligne || '')
      + (pied ? '<div class="k-pied">' + pied + '</div>' : '') + '</div>';
  }
  function illisible(x, nom, aide, cause, tag){
    x.illisibles++;
    return carte({ nom:nom, aide:aide, tag:tag, classe:'illisible', grand:'—', sous:'Non lu : ' + cause + '. N’en concluez rien.' });
  }
  function grise(nom, aide, message, tag, pied, extra){
    return carte({ nom:nom, aide:aide, tag:tag, classe:'gris', grand:'—', extra:extra, pied:[chip('gris', message)].concat(pied || []) });
  }

  // Semaines de mesure lisibles pour une période, ou le message qui dit pourquoi.
  function lues(x, p){
    var s = P.semainesMesure(x.a.parSemaine, x.J, p, x.premiere);
    // Écran : des mots simples ; la cause précise va dans la bulle (`s.bulle`).
    if(s.hors){ s.message = 'Trop ancien, plus conservé'; s.bulle = ['Les chiffres de l’application sont gardés 182 jours.']; }
    else if(s.absente !== null){
      s.message = (p.enCours && s.absente === p.fin) ? 'Pas encore de chiffre cette semaine' : 'Pas de chiffre pour cette période';
      s.bulle = ['L’application n’a rien envoyé la semaine du ' + P.jj_mm(s.absente) + ' : ce n’est pas un zéro, c’est une absence.'];
    }
    else if(!s.lues.length){ s.message = 'Pas encore mesuré à cette date'; s.bulle = ['La mesure de l’application a commencé le ' + P.jj_mm(x.premiere) + '.']; }
    return s;
  }
  function chipsPeriode(x, s){
    var out = [];
    if(x.p.enCours) out.push(chip('gris', 'en cours'));
    if(s && s.avant && s.lues.length) out.push(chip('gris', 'mesuré sur ' + s.lues.length + ' semaine' + (s.lues.length > 1 ? 's' : '') + ' sur ' + x.p.semaines.length));
    return out;
  }
  function finCourbe(x){ return x.p.enCours ? C.jourMoins(x.p.fin, 7) : x.p.fin; }

  // ── ARRIVENT ──────────────────────────────────────────────────────────────
  function audienceCarte(x, nom, aide, col, moyenne, plus){
    var tg = 'tests inclus';
    if(!x.d.audMesures || !x.d.audMesures.length) return grise(nom, aide, 'Aucune série RevenueCat archivée', tg);
    if(!C.audienceLibellesConformes(x.d.audMesures))
      return grise(nom, aide, 'Non affiché : les séries RevenueCat ont changé de nom', tg);
    var a = P.audience(x.d.audJours, x.p.jours, col);
    if(a.cause) return illisible(x, nom, aide, a.cause, tg);
    if(!a.lus) return grise(nom, aide, 'Pas encore de chiffre pour cette période', tg, [], ['RevenueCat n’a pas encore été relu pour ces jours (bouton « Actualiser », en haut).']);
    var parJour = a.somme / a.lus, pied = chipsPeriode(x);
    if(a.provisoire) pied.push(chip('gris', 'provisoire'));
    if(a.lus < a.sur && !x.p.enCours) pied.push(chip('gris', a.lus + ' jours sur ' + a.sur));
    var ajout = plus ? plus(a) : { extra:[] };
    if(a.negatifs) pied.push(chip('gris', a.negatifs + (a.negatifs > 1 ? ' jours non lus' : ' jour non lu')));
    if(!x.p.enCours){
      var b = P.audience(x.d.audJours, x.prev.jours, col);
      if(b.cause || !b.lus) pied.push(chip('gris', precNonMesuree(x)));
      else if(moyenne) pied.push(tend(P.variation(parJour, b.somme / b.lus), arrondi(b.somme / b.lus), x));
      else if(a.lus === a.sur && b.lus === b.sur) pied.push(tend(P.variation(a.somme, b.somme), String(b.somme), x));
      else pied.push(tend(P.variation(parJour, b.somme / b.lus), arrondi(b.somme / b.lus) + ' par jour', x));
    }
    return carte({ nom:nom, aide:aide, tag:tg, sous:ajout.sous, ligne:ajout.ligne, extra: (a.lus < a.sur && !x.p.enCours
        ? ['« ' + a.lus + ' jours sur ' + a.sur + ' » : un jour n’a pas encore été relu chez RevenueCat ; le calcul porte sur les jours connus.'] : [])
        .concat(a.negatifs ? ['Un jour à valeur négative n’est pas compté : la journée n’était pas entièrement relue.'] : [], ajout.extra || []),
      grand: moyenne ? arrondi(parJour) : String(a.somme),
      unite: moyenne ? 'en moyenne' : '≈ ' + arrondi(parJour) + ' par jour', pied:pied,
      courbe: courbe(P.courbeAudience(x.d.audJours, x.J, finCourbe(x), col)) });
  }

  // ARRIVENT = une seule carte (décision de Gaétan, 04/10). Ligne « sur N ouvertures »
  // (RevenueCat, tests compris) : mêmes règles que les autres séries RevenueCat
  // (« provisoire », « x jours sur 7 », jamais un 0 inventé) ; « environ 1 sur K »
  // seulement si les deux nombres valent au moins 10, les ouvertures sont complètes
  // et portent sur les mêmes semaines que les nouveaux.
  function ligneOuvertures(x, t, sem){
    var tg = ' <span class="tag">tests inclus</span>' + B.aide('Ouvertures de Pilou', 'ouvertures');
    function l(txt, chips, ko){ return '<div class="k-ligne' + (ko ? ' ko' : '') + '">' + ech(txt) + (chips || '') + tg + '</div>'; }
    if(!x.d.audMesures || !x.d.audMesures.length) return l('ouvertures de Pilou : aucune série RevenueCat archivée');
    if(!C.audienceLibellesConformes(x.d.audMesures)) return l('ouvertures de Pilou non lues (séries RevenueCat renommées)');
    var a = P.audience(x.d.audJours, x.p.jours, 'nouveaux');
    // Illisible : compté dans « chiffres non lus » (pastille générale rouge), en rouge, comme toute carte illisible.
    if(a.cause){ x.illisibles++; return l('ouvertures de Pilou non lues (' + a.cause + '). N’en concluez rien.', '', true); }
    if(!a.lus) return l('ouvertures de Pilou pas encore relevées');
    var chips = (a.provisoire ? chip('gris', 'provisoire') : '') + (a.lus < a.sur && !x.p.enCours ? chip('gris', a.lus + ' jours sur ' + a.sur) : '');
    var complet = a.lus === a.sur && !a.provisoire && !x.p.enCours && sem === x.p.semaines.length;
    var k = Math.round(a.somme / t);
    // K < 2 (au moins ~ 67 %) : « soit X % » plutôt qu'« environ 1 sur 1 ».
    var ratio = complet && t !== null && t >= C.MESURE_PLANCHER && a.somme >= C.MESURE_PLANCHER && a.somme >= t && k >= 1
      ? (k < 2 ? ' (soit ' + P.pctEntier(t, a.somme) + ')' : ' (environ 1 sur ' + k + ')') : '';
    return l('sur ' + a.somme + (a.somme > 1 ? ' ouvertures' : ' ouverture') + ' de Pilou' + ratio, chips);
  }
  // Courbe : nouveaux par semaine close, jusqu'à 8 semaines, arrêtée au premier trou.
  function courbeNouveaux(x){
    var out = [], fin = finCourbe(x);
    for(var k = 0; k < 8; k++){
      var w = C.jourMoins(fin, 7 * k);
      if(w < x.premiere || !C.aPropriete(x.a.parSemaine, w)) break;
      out.unshift(P.somme(x.cases, [w], 'jalon_accueil'));
    }
    return out;
  }
  function nouveaux(x){
    var nom = 'Nouveaux utilisateurs', aide = 'nouveaux';
    if(x.a.cause){ x.illisibles++;
      return carte({ nom:nom, aide:aide, classe:'illisible', grand:'—', sous:'Non lu : ' + x.a.cause + '. N’en concluez rien.', ligne:ligneOuvertures(x, null, 0) }); }
    var s = lues(x, x.p);
    if(s.message) return carte({ nom:nom, aide:aide, classe:'gris', grand:'—', extra:s.bulle, ligne:ligneOuvertures(x, null, 0),
      pied:[chip('gris', s.message)].concat(chipsPeriode(x)) });
    var t = P.somme(x.cases, s.lues, 'jalon_accueil'), web = P.somme(x.cases, s.lues, 'jalon_accueil', 'web');
    var pied = chipsPeriode(x, s);
    if(!x.p.enCours){
      var sp = lues(x, x.prev);
      if(sp.message || sp.avant) pied.push(chip('gris', precNonMesuree(x)));
      else { var tp = P.somme(x.cases, sp.lues, 'jalon_accueil'); pied.push(tend(P.variation(t, tp), String(tp), x)); }
    }
    return carte({ nom:nom, aide:aide, classe:'grand', grand:String(t), unite: t > 1 ? 'acceptations' : 'acceptation',
      sous:'Android ' + P.somme(x.cases, s.lues, 'jalon_accueil', 'and') + ' · iPhone '
        + P.somme(x.cases, s.lues, 'jalon_accueil', 'ios') + (web ? ' · Navigateur ' + web : ''),
      ligne:ligneOuvertures(x, t, s.lues.length), pied:pied, courbe:courbe(courbeNouveaux(x)) });
  }

  // ── S'EN SERVENT ─────────────────────────────────────────────────────────
  // V4.3 : la vue de l'historique (v_admin_entonnoir_semaine), lue en direct, sur les semaines de la période.
  function E(x){ return x.ent || (x.ent = racine.TDPilotage ? racine.TDPilotage.semaines(x.d.pilotage) : { cause:'le fichier td-pilotage.js n’a pas été chargé' }); }
  function S(x, cle){ return racine.TDPilotage.somme(E(x), x.p.semaines, cle); }
  // « Pilulier créé » : premiers traitements / acceptations 1.4.19+ de la période.
  // MASQUAGE (AIPD n° 5, plancher de 10 de la console) : aucun nombre ni
  // pourcentage si la période compte moins de 10 acceptations 1.4.19+, ou si
  // l'une de ses semaines en compte moins de 10 (sinon, le tableau d'historique
  // la ferait retrouver par soustraction).
  function pilulier(x){
    var nom = 'Pilulier créé', aide = 'pilulier', tg = 'hors tests', e = E(x);
    if(e.cause) return illisible(x, nom, aide, e.cause, tg);
    var num = S(x, 'premiers_traitements'), den = S(x, 'acceptations_v2'), pied = chipsPeriode(x);
    if(num.ko || den.ko) return illisible(x, nom, aide, 'valeur illisible dans la vue de l’historique', tg);
    if(num.hors || den.hors) return grise(nom, aide, 'Trop ancien, plus conservé', tg, [], ['L’historique garde 27 semaines.']);
    if(den.v === null && num.v === null) return grise(nom, aide, x.p.enCours ? 'Pas encore de chiffre cette semaine' : 'Pas de chiffre pour cette période', tg, pied);
    if(num.masque || den.v === null || den.v < C.MESURE_PLANCHER)
      return carte({ nom:nom, aide:aide, tag:tg, classe:'gris', grand:'—', pied:pied,
        sous: num.masque && den.v >= C.MESURE_PLANCHER ? 'Une semaine compte moins de 10 acceptations en 1.4.19 et plus : chiffre masqué' : 'Moins de 10 acceptations en 1.4.19 et plus : chiffre masqué' });
    if(num.v === null) return carte({ nom:nom, aide:aide, tag:tg, classe:'gris', grand:'—', pied:pied,
      sous:'Aucun premier traitement reçu · sur ' + den.v + ' acceptations en 1.4.19 et plus' });
    var n = num.v, extra = [];
    if(n > den.v) extra.push('Plus de piluliers que d’acceptations : des acceptations de semaines précédentes y contribuent, d’où l’absence de pourcentage.');
    return carte({ nom:nom, aide:aide, tag:tg, grand:String(n), extra:extra, pied:pied,
      unite: n <= den.v ? 'soit ' + P.pctEntier(n, den.v) : (n > 1 ? 'piluliers' : 'pilulier'),
      sous:'sur ' + den.v + ' acceptations en 1.4.19 et plus' });
  }

  // ── Actifs par jour. Ligne « jours d'utilisation » (V4.3) : total de la période,
  // lu en direct dans la vue de l'historique (versions 1.4.22 et plus, hors tests),
  // SEULEMENT si chaque semaine de la période a un chiffre. Sinon : rien.
  var OUVERTURES = ['jours_ouverture_moins_7j', 'jours_ouverture_7j_et_plus', 'jours_ouverture_anciennete_inconnue'];
  function ligne122(x){
    var e = E(x);
    if(e.cause || !x.p.semaines.length) return '';
    var t = 0;
    for(var i = 0; i < x.p.semaines.length; i++){
      var s = [x.p.semaines[i]], vu = false;
      for(var k = 0; k < OUVERTURES.length; k++){
        var o = racine.TDPilotage.somme(e, s, OUVERTURES[k]);
        if(o.ko || o.hors) return '';
        if(o.v !== null){ t += o.v; vu = true; }
      }
      if(!vu) return '';
    }
    return '<div class="k-ligne">' + ech('jours d’utilisation reçus (1.4.22 et plus) : ' + t + (x.p.enCours ? ' jusqu’à maintenant' : ''))
      + ' <span class="tag">hors tests</span>' + B.aide('Jours d’utilisation reçus', 'jours122') + '</div>';
  }
  function actifs(x){
    return audienceCarte(x, 'Actifs par jour', 'actifs', 'actifs', true, function(){ return { ligne:ligne122(x), extra:[] }; });
  }

  // ── Habitués par jour (V4.1) : personnes DÉJÀ VUES qui rouvrent Pilou, chaque jour
  // (`revenants` de RevenueCat, règles de la tuile « Personnes revenues »).
  function habitues(x){ return audienceCarte(x, 'Habitués par jour', 'habitues', 'revenants', true); }

  // ── REVIENNENT ───────────────────────────────────────────────────────────
  // Nombres de la période en direct (vue v_admin_mesure, « Nos tests » respecté).
  // Pourcentage : 4 semaines COMPLÈTES, décalées (définition de la console
  // détaillée) ; sur la semaine en cours, celui des 4 dernières semaines complètes.
  var NOMS_RET = ['le lendemain', 'du 2ᵉ au 7ᵉ jour', 'du 8ᵉ au 30ᵉ jour'], COURTS_RET = ['lendemain', '2ᵉ–7ᵉ jour', '8ᵉ–30ᵉ jour'];
  function reviennent(x){
    var nom = 'Rouvrent Pilou', aide = 'reviennent';
    if(x.a.cause) return illisible(x, nom, aide, x.a.cause);
    var s = lues(x, x.p);
    if(s.message) return grise(nom, aide, s.message, '', chipsPeriode(x), s.bulle);
    var er = P.etatRetention(x.a, x.J, x.premiere), cles = ['jalon_revenu_j1', 'jalon_revenu_j2_7', 'jalon_revenu_j8_30'];
    var montrer = er.fin === x.p.fin || (x.p.enCours && x.p.mode === 'semaine' && er.fin === C.jourMoins(x.p.fin, 7));
    var corps = '', extra = [], dates = [], motifs = [];
    for(var k = 0; k < 3; k++){
      var L = er.lignes[k], v = P.somme(x.cases, s.lues, cles[k]), pc = '';
      if(L.ok){
        if(montrer){
          extra.push('Sur les 4 dernières semaines complètes, ' + NOMS_RET[k] + ' : ' + L.pct + ' (' + L.num + ' sur ' + L.den
            + '). Fourchette plausible ' + L.fourchette + ' : plus elle est large, moins le chiffre est sûr.');
          pc = '<small>' + ech(P.pctEntier(L.num, L.den) + ' sur 4 sem.') + '</small>';
        }
      } else if(L.raison === 'date') dates.push(COURTS_RET[k] + ' : dès le ' + P.jj_mm(L.date));
      else motifs.push(COURTS_RET[k] + ' : ' + (L.raison === 'absente' ? 'l’application n’a rien envoyé la semaine du ' + P.jj_mm(L.semaine)
        : L.raison === 'plus' ? 'plus de retours que de nouveaux'
        : L.raison === 'peu' ? 'moins de 10 nouveaux' : 'rien reçu la dernière semaine complète'));
      corps += '<div class="duo"><span>' + ech(NOMS_RET[k].charAt(0).toUpperCase() + NOMS_RET[k].slice(1)) + '</span><span><b>' + v + '</b>' + pc + '</span></div>';
    }
    corps += '<div class="mini">Retours reçus ' + (x.p.mode === '4sem' ? 'ces 4 semaines' : 'cette semaine')
      + (x.p.enCours ? ', jusqu’à maintenant' : '') + ' (tous nouveaux confondus)</div>';
    var pied = chipsPeriode(x, s);
    if(dates.length){ pied.push(chip('gris', 'Pourcentage dès le ' + dates[0].replace(/^(.*) : dès le (.*)$/, '$2 ($1)'))); extra.push('Pourcentage calculable : ' + dates.join(' ; ') + '.'); }
    if(motifs.length){ pied.push(chip('gris', 'Pas de pourcentage pour l’instant')); extra.push('Pas de pourcentage : ' + motifs.join(' ; ') + '.'); }
    if(!montrer && (er.lignes[0].ok || er.lignes[1].ok || er.lignes[2].ok))
      pied.push(chip('gris', 'Pourcentage : 4 dernières semaines complètes seulement'));
    return carte({ nom:nom, aide:aide, extra:extra, corps:corps, pied:pied });
  }

  // ── RAPPORTENT ───────────────────────────────────────────────────────────
  function abonnes(x){
    var nom = 'Abonnés Pilou+', aide = 'abonnes', r = x.d.resume;
    if(!r) return illisible(x, nom, aide, 'le résumé manque', 'en ce moment');
    var n = C.entierOuNul(r.clients_payants);
    if(n === null) return illisible(x, nom, aide, 'colonne illisible', 'en ce moment');
    // Accès offerts : mêmes règles que la tuile « Abonnés » de la console détaillée
    // (index.html l. 4834-4849) ; nos octrois internes retirés si l'interrupteur est éteint.
    var ao = C.entierOuNul(r.acces_offerts_en_cours);
    if(ao === null) return illisible(x, nom, aide, 'colonne illisible', 'en ce moment');
    var marque = ('acces_offerts_en_cours_internes' in r) && ('acces_offerts_total_internes' in r);
    var internes = marque ? C.entierOuNul(r.acces_offerts_en_cours_internes) : 0;
    if(internes === null) return illisible(x, nom, aide, 'accès offerts internes illisibles', 'en ce moment');
    var aff = (marque && !x.avecTest) ? ao - internes : ao;
    if(aff < 0) return illisible(x, nom, aide, 'plus d’accès internes que d’accès en cours', 'en ce moment');
    return carte({ nom:nom, aide:aide, tag:'en ce moment', grand:String(n), unite: n > 1 ? 'payants' : 'payant',
      sous:'+ ' + aff + (aff > 1 ? ' accès offerts en cours' : ' accès offert en cours')
        + ((!marque && !x.avecTest) ? ' (nos accès internes n’ont pas pu être séparés)' : '') });
  }

  // Même calcul que la tuile « Net du mois » de la console détaillée : on
  // APPELLE c3-revenus.js et l'on capture ce qu'il aurait affiché.
  function net(x){
    var nom = 'Net du mois', aide = 'net';
    if(!racine.PilouC3) return illisible(x, nom, aide, 'le fichier des revenus n’a pas été chargé');
    if(!x.d.attendus) return illisible(x, nom, aide, 'les vues de revenus ne reconnaissent pas le compte administrateur');
    var dernier = x.p.dernierJour, mois1 = dernier.slice(0, 8) + '01';
    if(mois1 <= C.jourMoins(x.J, P.GARDE.net)) return grise(nom, aide, 'Trop ancien, plus conservé', '', [], ['Les revenus jour par jour sont gardés 62 jours.']);
    var cap = null, o = { tuileAccueil:function(t){ cap = t; return ''; }, jourMoins:C.jourMoins, lundiDe:C.lundiDe,
      jourLong:C.jourLong, montantTexte:C.montantTexte, moisTexte:C.moisTexte, ech:C.ech };
    if(x.p.enCours) racine.PilouC3.tuileNetMois(x.d.netJour, x.J, 'aujourdhui', o);
    else racine.PilouC3.tuileNetMois(x.d.netJour, C.jourMoins(x.p.fin, -7), 'semaine', o);
    if(!cap) return illisible(x, nom, aide, 'calcul impossible');
    if(cap.illisible) return illisible(x, nom, aide, String(cap.sous).replace(/^Non lu : /, '').replace(/\. N’en concluez rien\.$/, ''));
    var pied = chipsPeriode(x);
    if(cap.sousAttention) pied.push(chip('att', 'À vérifier dans la console détaillée'));
    var mois = String(cap.unite).replace(/ \d{4}$/, '');
    return carte({ nom:(/^[aeiouyéèh]/i.test(mois) ? 'Net d’' : 'Net de ') + mois,
      aide:aide, extra:['Détail : ' + cap.sous], grand:cap.grand,
      sous:'jusqu’au ' + C.jourLong(dernier).replace(/^\S+ /, '') + ' · après TVA et part des magasins', pied:pied });
  }

  function questions(x){
    function col(t, h){ return '<div class="q-col"><h3>' + t + '</h3>' + h + '</div>'; }
    return col('Arrivent', nouveaux(x))
      + col('S’en servent', pilulier(x) + actifs(x))
      + col('Reviennent', habitues(x) + reviennent(x))
      + col('Rapportent', abonnes(x) + net(x));
  }

  // ── SCAN D'ORDONNANCE (V4.3 : en direct, vue de l'historique, hors tests) ──────
  function barre(lb, r, base, pc){
    var v = r.v, w = base > 0 && v !== null ? Math.min(100, Math.round(100 * v / base)) : 0;
    return '<div class="ent' + (v === null ? ' fut' : '') + '"><span class="lb">' + ech(lb) + '</span><span class="bar">'
      + (v === null ? '' : (v > 0 ? '<i style="width:' + w + '%">' + ech(String(v)) + '</i>' : '<em>0</em>'))
      + '</span><span class="pc">' + ech(v === null ? '—' : pc) + '</span></div>';
  }
  function part(r, base){
    if(r.v === null || base.v === null) return '';
    return base.v >= P.PLANCHER ? P.pctEntier(r.v, base.v) : r.v + ' sur ' + base.v;
  }
  function scan(x){
    var h = '<div class="titre-c">Scan d’ordonnance' + B.aide('Scan d’ordonnance', 'scan') + chip('gris', 'en tentatives · hors tests') + '</div>', e = E(x);
    if(e.cause){ x.illisibles++; return h + '<div class="message ko">Non lu : ' + ech(e.cause) + '. N’en concluez rien.</div>' + serveur(x); }
    var sc = S(x, 'scans_lances'), ph = S(x, 'photos_annulees'), lr = S(x, 'listes_recues'), lv = S(x, 'listes_validees'),
      lc = S(x, 'listes_corrigees'), sm = S(x, 'saisies_validees'), tous = [sc, ph, lr, lv, lc, sm];
    for(var i = 0; i < tous.length; i++) if(tous[i].ko){ x.illisibles++; return h + '<div class="message ko">Non lu : valeur illisible dans la vue de l’historique. N’en concluez rien.</div>' + serveur(x); }
    if(sc.hors) return h + '<div class="message">Trop ancien, plus conservé (27 semaines).</div>' + serveur(x);
    if(sc.v === null && ph.v === null && lr.v === null && lv.v === null && sm.v === null)
      return h + '<div class="message">' + (x.p.enCours ? 'Pas encore de chiffre cette semaine' : 'Pas de chiffre pour cette période') + '</div>' + serveur(x);
    var base = sc.v || 0;
    if(sc.v !== null && base < P.PLANCHER) h += '<div class="mini">' + chip('gris', 'Petit nombre : pas de pourcentage sous 10 scans') + '</div>';
    h += barre('Scans lancés', sc, base, '');
    h += barre('Photo annulée', ph, base, part(ph, sc));
    h += barre('Liste reçue', lr, base, part(lr, sc));
    h += barre('Liste enregistrée', lv, base, part(lv, sc));
    h += barre('dont corrigée', lc, base, part(lc, lv));   // même échelle que les autres barres (revue V4.3)
    h += '<div class="ent seul"><span class="lb">Saisie à la main</span><span class="mini">sans photo</span><span class="pc">' + ech(sm.v === null ? '—' : String(sm.v)) + '</span></div>';
    h += '<div class="mini">Pourcentages : part des scans lancés ; « dont corrigée » : part des listes enregistrées.'
      + ' Photo annulée, liste enregistrée, corrigée et saisie : versions 1.4.22 et plus seulement ; scans : toutes versions.'
      + (x.p.enCours ? ' Semaine en cours, jusqu’à maintenant.' : '') + '</div>';
    return h + serveur(x);
  }
  function serveur(x){
    var r = P.scanServeur(x.d.scan, x.J, x.p), aide = B.aide('Vu par le serveur', 'serveur'), tg = '<span class="tag">tests inclus</span>';
    if(r.cause){ x.illisibles++; return '<div class="serveur ko">Vu par le serveur : <b>non lu</b> (' + ech(r.cause) + ')' + aide + tg + '</div>'; }
    if(r.hors) return '<div class="serveur">Vu par le serveur : — trop ancien (14 jours gardés)' + aide + tg + '</div>';
    return '<div class="serveur">Vu par le serveur : <b>' + r.servis + (r.servis > 1 ? ' listes rendues' : ' liste rendue')
      + '</b> sur ' + r.envoyes + (r.envoyes > 1 ? ' envois' : ' envoi') + aide + tg + '</div>';
  }

  // ── OFFICINES : même source et mêmes textes que apporteurs.js ────────────
  function officines(x){
    var h = '<div class="titre-c">Officines' + B.aide('Officines', 'officines') + '</div>', caps = [];   // (en-tête refait avec la bulle complète)
    if(!racine.PilouApporteurs){ x.illisibles++; return h + '<div class="message ko">Non lu : le fichier des officines n’a pas été chargé.</div>'; }
    var o = { tuileAccueil:function(t){ caps.push(t); return ''; }, tuileIllisible:function(nom, cause){ caps.push({ nom:nom, illisible:true, sous:cause }); return ''; },
      entierOuNul:C.entierOuNul, fourchetteMesure:C.fourchetteMesure, jourTexte:C.jourTexte };
    try { racine.PilouApporteurs.tuiles(x.d.cohorte, o); }
    catch(e){ x.illisibles++; return h + '<div class="message ko">Non lu : ' + ech(e && e.message ? e.message : e) + '.</div>'; }
    if(!caps.length) return h + '<div class="message">Aucun apporteur actif.</div>';
    var corps = '<div class="lignes">', extra = [];
    for(var i = 0; i < caps.length; i++){
      var t = caps[i], sous = String(t.sous || '').replace(/\.$/, '');
      if(t.illisible) x.illisibles++;
      // Texte d'apporteurs.js ; à l'écran, pourcentage ENTIER, la fourchette va dans la bulle.
      var f = / — (\d+(?:,\d)?) %( \(entre [^)]*\))?/.exec(sous);
      if(f){ extra.push(t.nom + ' : ' + f[1] + ' %' + (f[2] || '')); sous = sous.replace(f[0], ' — ' + Math.round(Number(f[1].replace(',', '.'))) + ' %'); }
      corps += '<div><span><strong>' + ech(t.illisible ? 'Codes des apporteurs' : t.nom) + '</strong><br><span class="mini">'
        + ech(t.illisible ? 'Non lu : ' + t.sous + '. N’en concluez rien.' : sous) + '</span></span><b'
        + (t.illisible ? ' class="ko">—' : '>' + ech(t.grand)) + '</b></div>';
    }
    return '<div class="titre-c">Officines' + B.aide('Officines', 'officines', extra) + '</div>' + corps + '</div>';
  }

  racine.TDCartes = { questions:questions, scan:scan, officines:officines, chip:chip };
})(typeof window !== 'undefined' ? window : this);
