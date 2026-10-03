/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — LES CARTES
 * ============================================================================
 * Quatre questions (arrivent, s'en servent, reviennent, rapportent), puis le
 * scan d'ordonnance et les officines. Chaque carte reçoit le contexte `x` :
 *   { d (vues lues), J (jour de la base), p / prev (période et précédente),
 *     avecTest, a (agregerMesure), cases (par semaine/clé/plateforme),
 *     ach (agrégat de v_admin_mesure_charge) }.
 * RÈGLES : toute donnée passe par `ech` ; illisible → « — » rouge, jamais 0 ;
 * absent → « — » gris qui dit pourquoi ; vert/orange/rouge réservés aux
 * pastilles d'état ; flèches de tendance neutres ; semaine en cours : ni
 * flèche ni pourcentage. ES5 strict. Expose `TDCartes`.
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
    return carte({ nom:nom, aide:aide, classe:'grand', grand:String(t), unite:'premiers pas',
      sous:'Android ' + P.somme(x.cases, s.lues, 'jalon_accueil', 'and') + ' · iPhone '
        + P.somme(x.cases, s.lues, 'jalon_accueil', 'ios') + (web ? ' · Navigateur ' + web : ''),
      ligne:ligneOuvertures(x, t, s.lues.length), pied:pied, courbe:courbe(courbeNouveaux(x)) });
  }

  // ── S'EN SERVENT ─────────────────────────────────────────────────────────
  // « Pilulier créé » : TOUJOURS sur une fenêtre de 4 semaines finissant à la
  // semaine regardée — en « Semaine » comme en « 4 semaines » (contre-revue,
  // M4 bis). Alignée sur la console détaillée, c'est SON calcul
  // (`premierTraitementMesure`) et SES règles : chiffres identiques. Une autre
  // fenêtre suit les mêmes règles, et elle est en plus masquée si une de ses
  // semaines manque. Jamais un chiffre d'une seule semaine : une semaine sous le
  // plancher ne se retrouve pas par soustraction (voir le rapport).
  function pilulier(x){
    var nom = 'Pilulier créé', aide = 'pilulier';
    if(x.a.cause) return illisible(x, nom, aide, x.a.cause);
    if(x.p.enCours) return grise(nom, aide, 'Disponible à la fin de la semaine', '', chipsPeriode(x));
    var pt = C.premierTraitementMesure(x.a), aligne = !pt.cause && pt.fin === x.p.fin, w, num, den, manque = null;
    if(aligne){ num = pt.num; den = pt.den; manque = pt.manque; }
    else {
      num = 0; den = 0;
      for(w = 0; w < 4; w++){
        var sw = C.semaineMoins(x.p.fin, w);
        if(!C.aPropriete(x.a.parSemaine, sw) && manque === null) manque = sw;
        num += C.caseMesure(x.a, sw, 'jalon_creation_jour_essai') + C.caseMesure(x.a, sw, 'jalon_creation_plus_tard');
        den += C.caseMesure(x.a, sw, 'jalon_accueil_v2');
      }
    }
    var fenetre = aligne ? '4 dernières semaines' : '4 semaines jusqu’au ' + P.jj_mm(x.p.dimanche);
    var fin30 = C.jourMoins(x.p.dimanche, -30), ouvert = x.J <= fin30, pied = [], extra = ['Calculé sur les nouveaux en version 1.4.19 ou plus.'];
    if(ouvert) pied.push(chip('gris', 'D’autres peuvent arriver jusqu’au ' + P.jj_mm(fin30)));
    // Règles de la console détaillée : sous 10 nouveaux, AUCUN nombre de piluliers (AIPD n° 5).
    if(den < C.MESURE_PLANCHER) return carte({ nom:nom, aide:aide, classe:'gris', grand:'—', extra:extra,
      sous: (den ? 'Moins de 10 nouveaux : chiffre masqué' : 'Aucun nouveau') + ' · ' + fenetre, pied:pied });
    if(!aligne && manque) return carte({ nom:nom, aide:aide, classe:'gris', grand:'—',
      extra: extra.concat(['L’application n’a rien envoyé la semaine du ' + P.jj_mm(manque) + ' : pas de chiffre sur cette fenêtre.']),
      sous:'Pas de chiffre · ' + fenetre, pied:pied });
    var pct = '';
    if(manque){
      // Même date que pour « Rouvrent Pilou » : 4 semaines complètes après le début de la mesure.
      var dPct = C.jourMoins(x.premiere, -28);
      pied.unshift(chip('gris', dPct > x.J ? 'Pourcentage dès le ' + P.jj_mm(dPct) : 'Pas de pourcentage pour l’instant'));
      extra.push('Pas de pourcentage : l’application n’a rien envoyé la semaine du ' + P.jj_mm(manque) + ' (4 semaines complètes nécessaires).');
    } else if(num > den){
      pied.unshift(chip('gris', 'Pas de pourcentage pour l’instant'));
      extra.push('Plus de piluliers que de nouveaux sur la fenêtre : des nouveaux plus anciens y contribuent.');
    } else pct = P.pctEntier(num, den);
    if(pct && aligne) extra.push('Console détaillée : ' + C.pctMesure(num, den) + '.');
    return carte({ nom:nom, aide:aide, grand:String(num), extra:extra,
      unite: pct ? 'soit ' + pct : (ouvert ? 'pour l’instant' : (num > 1 ? 'piluliers' : 'pilulier')),
      sous:'sur ' + den + ' nouveaux · ' + fenetre, pied:pied });
  }

  // ── Actifs par jour. Ligne « 1.4.22 » (revue adverse V4.1, M2) : jours
  // d'utilisation reçus de l'application (`envoi_recu`, charge 3, hors tests),
  // SEULEMENT si toute la période est postérieure à la sortie : à partir de la
  // première semaine ENTIÈRE après la sortie Android du 03/10, et chaque semaine
  // de la période doit avoir des lignes. Sinon : rien (pas de ligne grise).
  var SEMAINE_V3 = '2026-10-05';
  function ligne122(x){
    if(x.p.enCours || x.ach.cause || !x.p.semaines.length || x.p.semaines[0] < SEMAINE_V3) return '';
    var e = P.envoisParJour(x.d.mesureCharge, x.p.semaines);
    if(!e || !e.semaines || e.semaines < e.sur) return '';
    return '<div class="k-ligne">' + ech('jours d’utilisation reçus de la 1.4.22 : ' + arrondi(e.parJour) + ' par jour (premier jour compris) · Android '
      + arrondi(e.and) + ' · iPhone ' + arrondi(e.ios)) + ' <span class="tag">hors tests</span>' + B.aide('Jours d’utilisation reçus de la 1.4.22', 'jours122') + '</div>';
  }
  function actifs(x){
    return audienceCarte(x, 'Actifs par jour', 'actifs', 'actifs', true, function(){ return { ligne:ligne122(x), extra:[] }; });
  }

  // ── Habitués par jour (V4.1) : personnes DÉJÀ VUES qui rouvrent Pilou, chaque jour
  // (`revenants` de RevenueCat, règles de la tuile « Personnes revenues »).
  function habitues(x){ return audienceCarte(x, 'Habitués par jour', 'habitues', 'revenants', true); }

  // ── REVIENNENT ───────────────────────────────────────────────────────────
  var NOMS_RET = ['le lendemain', 'du 2ᵉ au 7ᵉ jour'];
  function reviennent(x){
    var nom = 'Rouvrent Pilou', aide = 'reviennent';
    if(x.a.cause) return illisible(x, nom, aide, x.a.cause);
    var s = lues(x, x.p);
    if(s.message) return grise(nom, aide, s.message, '', chipsPeriode(x), s.bulle);
    var er = P.etatRetention(x.a, x.J, x.premiere), cles = ['jalon_revenu_j1', 'jalon_revenu_j2_7'];
    var montrer = !x.p.enCours && er.fin === x.p.fin, corps = '', extra = [], dates = [], motifs = [];
    for(var k = 0; k < 2; k++){
      var L = er.lignes[k], v = P.somme(x.cases, s.lues, cles[k]), pc = '';
      if(L.ok){
        // Le pourcentage (et sa bulle) seulement pour la fenêtre qui finit à la semaine regardée.
        if(montrer){
          extra.push('Sur 4 semaines, ' + NOMS_RET[k] + ' : ' + L.pct + ' (' + L.num + ' sur ' + L.den
            + '). Fourchette plausible ' + L.fourchette + ' : plus elle est large, moins le chiffre est sûr.');
          pc = '<small>' + ech(P.pctEntier(L.num, L.den) + ' sur 4 sem.') + '</small>';
        }
      } else if(L.raison === 'date') dates.push(L.date);
      else motifs.push(L.raison === 'absente' ? 'l’application n’a rien envoyé la semaine du ' + P.jj_mm(L.semaine)
        : L.raison === 'plus' ? 'plus de retours que de nouveaux'
        : L.raison === 'peu' ? 'moins de 10 nouveaux' : 'rien reçu la dernière semaine complète');
      corps += '<div class="duo"><span>' + (k ? 'Du 2ᵉ au 7ᵉ jour' : 'Le lendemain') + '</span><span><b>' + v + '</b>' + pc + '</span></div>';
    }
    corps += '<div class="mini">Retours reçus ' + (x.p.mode === '4sem' ? 'ces 4 semaines' : 'cette semaine')
      + ' (tous nouveaux confondus)</div>';
    var pied = chipsPeriode(x, s);
    if(dates.length){
      pied.push(chip('gris', dates.length === 2 && dates[0] !== dates[1]
        ? 'Pourcentage à partir du ' + P.jj_mm(dates[0]) + ' (lendemain) et du ' + P.jj_mm(dates[1])
        : 'Pourcentage à partir du ' + P.jj_mm(dates[0])));
      extra.push('Pourcentage calculable le ' + P.jj_mm(dates[0]) + (dates[1] ? ' (le lendemain), le ' + P.jj_mm(dates[1]) + ' (du 2ᵉ au 7ᵉ jour)' : '') + '.');
    }
    if(motifs.length){ pied.push(chip('gris', 'Pas de pourcentage pour l’instant')); extra.push('Pas de pourcentage : ' + motifs.join(' ; ') + '.'); }
    if(!montrer && !x.p.enCours && (er.lignes[0].ok || er.lignes[1].ok))
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

  // ── SCAN D'ORDONNANCE ────────────────────────────────────────────────────
  function barre(lb, v, base, pc, fut){
    var w = base > 0 ? Math.min(100, Math.round(100 * v / base)) : 0;
    return '<div class="ent' + (fut ? ' fut' : '') + '"><span class="lb">' + ech(lb) + '</span><span class="bar">'
      + (fut ? '' : (v > 0 ? '<i style="width:' + w + '%">' + ech(String(v)) + '</i>' : '<em>0</em>'))
      + '</span><span class="pc">' + ech(pc) + '</span></div>';
  }
  var ETAPES = [['scan_lance','Scan lancé'],['photo_obtenue','Photo prise'],['consentement_affiche','Accord demandé'],
    ['analyse_envoyee','Analyse envoyée'],['liste_recue','Liste reçue']];
  var RECENTES = [['liste_validee','Liste enregistrée'],['liste_corrigee','Liste corrigée'],['saisie_manuelle_validee','Saisie à la main']];

  function scan(x){
    var h = '<div class="titre-c">Scan d’ordonnance' + B.aide('Scan d’ordonnance', 'scan') + chip('gris', 'en tentatives') + '</div>';
    if(x.a.cause){ x.illisibles++; h += '<div class="message ko">Non lu : ' + ech(x.a.cause) + '. N’en concluez rien.</div>'; }
    else {
      var s = lues(x, x.p);
      if(s.message) h += '<div class="message">' + ech(s.message) + '</div>';
      else {
        var base = P.somme(x.cases, s.lues, 'scan_lance'), petit = base < P.PLANCHER;
        if(petit) h += '<div class="mini">' + chip('gris', 'Petit nombre : pas de pourcentage sous 10 scans') + '</div>';
        for(var i = 0; i < ETAPES.length; i++){
          var v = P.somme(x.cases, s.lues, ETAPES[i][0]);
          h += barre(ETAPES[i][1], v, base, petit ? v + ' sur ' + base : P.pctEntier(v, base));
        }
        if(s.avant) h += '<div class="mini">Compté sur ' + s.lues.length + ' des ' + x.p.semaines.length + ' semaines (la mesure a commencé le ' + ech(P.jj_mm(x.premiere)) + ').</div>';
      }
      h += recentes(x);
    }
    return h + serveur(x);
  }
  function recentes(x){
    function tete(msg){ return '<div class="sep">Avec la dernière version (1.4.22)' + B.aide('Dernière version', 'scanRecent')
      + (msg ? chip('gris', msg) : '') + '</div>'; }
    function futures(court, msg){
      var o = tete(msg);
      for(var i = 0; i < RECENTES.length; i++) o += barre(RECENTES[i][1], 0, 0, i ? '' : court, true);
      return o;
    }
    if(x.ach.cause){ x.illisibles++; return tete('') + '<div class="message ko">Non lu : ' + ech(x.ach.cause) + '. N’en concluez rien.</div>'; }
    if(x.p.enCours) return futures('', 'disponible à la fin de la semaine');
    var sem = [];
    for(var k = 0; k < x.p.semaines.length; k++) if(x.p.semaines[k] > C.jourMoins(x.J, P.GARDE.mesure)) sem.push(x.p.semaines[k]);
    if(sem.length < x.p.semaines.length) return futures('', 'trop ancien');
    var base = P.sommeCharge(x.ach, sem, 3, 'scan_lance');
    if(!base){
      var p1 = P.V3_PREMIERE, court = String(Number(p1.slice(8, 10))) + '–' + P.jj_mm(C.jourMoins(p1, -6));
      return x.p.dimanche < p1 ? futures(court, 'premiers chiffres : semaine du ' + court)
                               : futures('', 'aucun scan avec cette version');
    }
    // Sens vérifié dans l'application (src/lib/mesureValidation.ts, l. 192-214) :
    // « liste enregistrée » vient d'un scan ; « liste corrigée » en est un
    // SOUS-ENSEMBLE ; « saisie à la main » se fait SANS scan (nombre seul).
    var val = P.sommeCharge(x.ach, sem, 3, 'liste_validee'), cor = P.sommeCharge(x.ach, sem, 3, 'liste_corrigee');
    var main = P.sommeCharge(x.ach, sem, 3, 'saisie_manuelle_validee');
    // « Petit nombre » seulement si AUCUNE des deux lignes n'a de pourcentage.
    var h = tete(base < P.PLANCHER && val < P.PLANCHER ? 'Petit nombre' : '');
    h += barre('Liste enregistrée', val, base, base >= P.PLANCHER ? P.pctEntier(val, base) + ' des scans' : val + ' sur ' + base);
    h += val ? barre('Liste corrigée', cor, val, val >= P.PLANCHER ? P.pctEntier(cor, val) + ' des listes' : cor + ' sur ' + val)
             : barre('Liste corrigée', 0, 0, '—', true);
    h += '<div class="ent seul"><span class="lb">Saisie à la main</span><span class="mini">sans photo</span><span class="pc">' + main + '</span></div>';
    return h + '<div class="mini">' + base + (base > 1 ? ' scans lancés' : ' scan lancé') + ' avec cette version.</div>';
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
