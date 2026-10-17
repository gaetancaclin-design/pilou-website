/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — PILOTAGE SEMAINE PAR SEMAINE
 * ============================================================================
 * Lit `v_admin_entonnoir_semaine` (27 lignes, une par lundi, 182 jours), lue
 * par td-donnees.js avec les autres vues (même session, même jeton), en vue
 * FACULTATIVE : son échec n'éteint que cette section, jamais la page.
 * Affiche : 6 chiffres de la semaine en cours (et la dernière semaine complète
 * à côté, sans flèche), puis un tableau semaines × colonnes, par blocs.
 * RÈGLES (celles de td-cartes.js) :
 *  - toute donnée passe par `ech` ; null → « — » gris, jamais 0 ; valeur
 *    illisible ou colonne absente → « — » rouge, comptée et signalée ;
 *  - parts = fractions (0.262 → « 26 % ») ; pas de pourcentage sous 10 ;
 *    premiers traitements masqués sous 10 acceptations 1.4.19+ (AIPD n° 5,
 *    même règle que la carte « Pilulier créé ») ;
 *  - semaine en cours : étiquetée « en cours », jamais comparée ;
 *  - aucune requête, aucun stockage : `maj` ne fait que dessiner.
 * `maj` ne lève JAMAIS : un défaut ici n'atteint pas le reste du tableau.
 * ES5 strict. Expose `TDPilotage`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, P = racine.TDPeriode, B = racine.TDBulles;
  function ech(s){ return C.ech(s); }
  var VISIBLES = 8, PLANCHER = 10;

  // t : n entier, d décimal, p part (fraction), e euros. base : colonne qui doit
  // valoir au moins 10 pour afficher (parts ; premiers traitements).
  function col(c, l, t, a, base){ return { c:c, l:l, t:t, a:a, base:base || null }; }
  function rc(o){ o.tag = 'tests inclus'; return o; }   // RevenueCat : nos tests compris
  var BLOCS = [
    { nom:'Arrivées', a:'pilArrivees', cols:[
      rc(col('rc_nouveaux', 'RC nouveaux', 'n', 'pilRc')), rc(col('rc_actifs_moy_jour', 'RC actifs par jour', 'd', 'pilActifs')),
      col('entrees', 'Entrées', 'n', 'pilEntrees'),
      col('acceptations', 'Acceptations', 'n', 'pilAcc'), col('acceptations_v2', 'dont 1.4.19 et plus', 'n', 'pilAccV2'),
      col('part_acceptation_sur_rc', 'Part sur RC', 'p', 'pilPartAcc', 'rc_nouveaux')] },
    { nom:'Activation', a:'pilActivation', cols:[
      col('premiers_traitements', 'Premiers traitements', 'n', 'pilPt', 'acceptations_v2'),
      col('part_premier_traitement_sur_acceptation_v2', 'Part', 'p', 'pilPartPt', 'acceptations_v2')] },
    { nom:'Retour', a:'pilRetour', cols:[
      col('retour_j1', 'Lendemain', 'n', 'pilJ1'), col('retour_j2_7', '2ᵉ–7ᵉ jour', 'n', 'pilJ27'),
      col('retour_j8_30', '8ᵉ–30ᵉ jour', 'n', 'pilJ830'), col('jours_ouverture_moins_7j', 'Ouvertures < 7 j', 'n', 'pilOuvR'),
      col('jours_ouverture_7j_et_plus', 'Ouvertures ≥ 7 j', 'n', 'pilOuvA')] },
    { nom:'Scan', a:'pilScan', cols:[
      col('scans_lances', 'Scans lancés', 'n', 'pilScans'), col('photos_annulees', 'Photos annulées', 'n', 'pilPhotos'),
      col('part_photo_annulee_sur_scan', 'Part', 'p', 'pilPartPhoto', 'scans_lances'),
      col('listes_recues', 'Listes reçues', 'n', 'pilListes'), col('listes_validees', 'Enregistrées', 'n', 'pilValidees'),
      col('listes_corrigees', 'Corrigées', 'n', 'pilCorrigees'),
      col('part_liste_corrigee_sur_validee', 'Part', 'p', 'pilPartCorr', 'listes_validees'),
      col('saisies_validees', 'Saisies à la main', 'n', 'pilSaisies')] },
    { nom:'Scan · serveur', a:'pilServeur', tag:'tests inclus', cols:[
      col('serveur_listes', 'Listes', 'n', 'pilSrvListes'), col('serveur_listes_vides', 'Vides', 'n', 'pilSrvVides'),
      col('serveur_refus_limite', 'Refus (limite)', 'n', 'pilSrvRefus'), col('serveur_echecs', 'Échecs', 'n', 'pilSrvEchecs')] },
    { nom:'Abonnement', a:'pilAbonnement', cols:[
      col('ecran_abonnement', 'Écran vu', 'n', 'pilEcran'), col('quota_atteint', 'Quota atteint', 'n', 'pilQuota'),
      col('achats_payants', 'Achats payants', 'n', 'pilAchats'), col('essais_commences', 'Essais', 'n', 'pilEssais'),
      col('renouvellements', 'Renouvellements', 'n', 'pilRenouv'), col('encaisse_brut_eur', 'Encaissé brut', 'e', 'pilEncaisse'),
      col('encaissements_autre_devise', 'Autres devises', 'n', 'pilDevises')] },
    { nom:'À partir de la 1.4.32', a:'pilV432', cols:[
      col('jours_ouverture_7_30j', 'Ouvertures 7–30 j', 'n', 'pilOuvM'), col('jours_ouverture_31_90j', 'Ouvertures 31–90 j', 'n', 'pilOuvT'),
      col('jours_ouverture_plus_90j', 'Ouvertures > 90 j', 'n', 'pilOuvL'),
      col('jours_ouverture_anciennete_inconnue', 'Ouvertures inconnue', 'n', 'pilOuvI'),
      col('installations_presentes', 'Présentes', 'n', 'pilPresentes'), col('presentes_moins_7j', 'Présentes < 7 j', 'n', 'pilPresTranche'),
      col('presentes_7_30j', 'Présentes 7–30 j', 'n', 'pilPresTranche'), col('presentes_31_90j', 'Présentes 31–90 j', 'n', 'pilPresTranche'),
      col('presentes_plus_90j', 'Présentes > 90 j', 'n', 'pilPresTranche'),
      col('presentes_anciennete_inconnue', 'Présentes inconnue', 'n', 'pilPresTranche'),
      col('presentes_avec_rappels_autorises', 'Avec rappels', 'n', 'pilRappels'),
      col('part_presentes_avec_rappels', 'Part', 'p', 'pilPartRappels', 'installations_presentes')] }
  ];
  var COLONNES = ['semaine', 'semaine_en_cours'];
  for(var b = 0; b < BLOCS.length; b++) for(var c = 0; c < BLOCS[b].cols.length; c++) COLONNES.push(BLOCS[b].cols[c].c);

  // ── Lecture d'une valeur : { v } (null = absente) ou { ko:true } ────────────
  function lire(ligne, nom, t){
    if(!Object.prototype.hasOwnProperty.call(ligne, nom)) return { ko:true, manque:true };
    var x = ligne[nom];
    if(x === null) return { v:null };
    var v = t === 'n' ? C.entierOuNul(x) : C.decimalOuNul(x);
    if(v === null || v < 0 || (t === 'p' && v > 1000)) return { ko:true };
    return { v:v };
  }
  function texte(v, t){
    // Deux arrondis : 0.145 * 100 vaut 14,4999… en JavaScript (14 % au lieu de 15 %).
    if(t === 'p') return Math.round(Math.round(v * 1000) / 10) + ' %';
    if(t === 'e') return C.montantTexte(v, 'EUR');
    if(t === 'd') return C.unDecimal(v);
    return String(v);
  }
  // Valeur affichable d'une cellule : { h (HTML échappé), t (texte), v, ko, petit }.
  var VIDE = { h:'<span class="pil-vide">—</span>', t:'—', v:null };
  function cellule(ligne, k, ctx){
    var r = lire(ligne, k.c, k.t);
    if(r.ko){ ctx.illisibles++; if(r.manque) ctx.manquent[k.c] = true; return { h:'<span class="pil-ko">—</span>', t:'—', v:null, ko:true }; }
    if(r.v === null) return VIDE;
    if(k.base){
      var bs = lire(ligne, k.base, 'n');
      if(bs.ko || bs.v === null || bs.v < PLANCHER) return { h:VIDE.h, t:'—', v:null, petit:true };
    }
    var t = texte(r.v, k.t);
    return { h:ech(t), t:t, v:r.v };
  }

  // ── Les lignes : semaines valides, triées de la plus récente à la plus ancienne ──
  function preparer(donnees){
    var out = { lignes:[], rejet:0, encours:null, erreur:null };
    var vues = {};
    for(var i = 0; i < donnees.length; i++){
      var l = donnees[i];
      if(!l || typeof l !== 'object' || !C.jourValide(l.semaine) || C.lundiDe(l.semaine) !== l.semaine
         || typeof l.semaine_en_cours !== 'boolean'){ out.rejet++; continue; }
      if(vues[l.semaine]) return { erreur:'la semaine du ' + P.jj_mm(l.semaine) + ' revient deux fois' };
      vues[l.semaine] = true;
      if(l.semaine_en_cours){
        if(out.encours) return { erreur:'deux semaines sont marquées « en cours »' };
        out.encours = l;
      }
      out.lignes.push(l);
    }
    out.lignes.sort(function(a, z){ return a.semaine < z.semaine ? 1 : (a.semaine > z.semaine ? -1 : 0); });
    if(out.encours && out.lignes[0] !== out.encours) return { erreur:'la semaine en cours n’est pas la plus récente' };
    out.precedente = null;
    if(out.encours){
      var avant = C.jourMoins(out.encours.semaine, 7);
      for(var j = 0; j < out.lignes.length; j++) if(out.lignes[j].semaine === avant) out.precedente = out.lignes[j];
    }
    return out;
  }

  // ── Chiffres clés de la semaine en cours ───────────────────────────────────
  var COL = {};
  for(var b2 = 0; b2 < BLOCS.length; b2++) for(var c2 = 0; c2 < BLOCS[b2].cols.length; c2++) COL[BLOCS[b2].cols[c2].c] = BLOCS[b2].cols[c2];
  function val(l, nom, ctx){ return l ? cellule(l, COL[nom], ctx) : VIDE; }
  function brut(x){ return x.t; }

  // o = { nom, aide, tag, cur:{v,h,ko}, unite, sous, prec (texte) }
  function tuile(o){
    var cl = o.cur.ko ? ' illisible' : (o.cur.v === null ? ' gris' : '');
    return '<div class="c' + cl + '"><div class="k-tete">' + ech(o.nom) + B.aide(o.nom, o.aide, o.extra)
      + (o.tag ? '<span class="tag">' + ech(o.tag) + '</span>' : '') + '</div>'
      + '<div class="k-val"><b>' + (o.cur.ko || o.cur.v === null ? '—' : o.cur.h) + '</b>'
      + (o.unite && !o.cur.ko && o.cur.v !== null ? '<span>' + ech(o.unite) + '</span>' : '') + '</div>'
      + (o.cur.ko ? '<div class="k-sous">Non lu : valeur illisible. N’en concluez rien.</div>' : (o.sous ? '<div class="k-sous">' + ech(o.sous) + '</div>' : ''))
      + '<div class="pil-prec">' + ech(o.precLib) + ' <b>' + ech(o.prec) + '</b></div></div>';
  }
  function part(x){ return x.v === null ? '' : x.t; }
  // `ctx` propre aux chiffres clés : les illisibles sont comptés une fois, par le tableau.
  function chiffresCles(pr){
    var ctx = { illisibles:0, manquent:{} };
    var cur = pr.encours, prv = pr.precedente, lib = prv ? 'Semaine du ' + P.jj_mm(prv.semaine) + ', complète :'
      : 'Semaine précédente : non reçue';
    function deux(l, a, bq){ var py = part(val(l, bq, ctx)); return brut(val(l, a, ctx)) + (py ? ' · ' + py : ''); }
    var acc = val(cur, 'acceptations', ctx), v2 = val(cur, 'acceptations_v2', ctx);
    var pt = val(cur, 'premiers_traitements', ctx), ppt = val(cur, 'part_premier_traitement_sur_acceptation_v2', ctx);
    var ph = val(cur, 'photos_annulees', ctx), sc = val(cur, 'scans_lances', ctx), pph = val(cur, 'part_photo_annulee_sur_scan', ctx);
    var j1 = val(cur, 'retour_j1', ctx), j830 = val(cur, 'retour_j8_30', ctx);
    var t = [
      tuile({ nom:'Acceptations', aide:'pilAcc', cur:acc, sous: v2.v !== null && !v2.ko ? 'dont ' + brut(v2) + ' en 1.4.19 ou plus' : '',
        precLib:lib, prec: prv ? brut(val(prv, 'acceptations', ctx)) : '' }),
      tuile({ nom:'Premiers traitements', aide:'pilPt', cur:pt, unite: part(ppt) ? 'soit ' + part(ppt) : '',
        sous: pt.petit ? 'Moins de 10 acceptations en 1.4.19 ou plus : chiffre masqué'
          : (v2.v !== null && !v2.ko ? 'sur ' + brut(v2) + ' acceptations en 1.4.19 ou plus' : ''),
        precLib:lib, prec: prv ? deux(prv, 'premiers_traitements', 'part_premier_traitement_sur_acceptation_v2') : '' }),
      tuile({ nom:'Retours du 2ᵉ au 7ᵉ jour', aide:'pilJ27', cur:val(cur, 'retour_j2_7', ctx),
        sous:'le lendemain : ' + brut(j1) + ' · du 8ᵉ au 30ᵉ jour : ' + brut(j830),
        precLib:lib, prec: prv ? brut(val(prv, 'retour_j2_7', ctx)) : '' }),
      tuile({ nom:'Photos annulées', aide:'pilPhotos', extra:B.textes.pilPartPhoto, cur:ph,
        unite: sc.v !== null && !sc.ko ? 'sur ' + brut(sc) + ' scans' : '', sous: part(pph) ? 'soit ' + part(pph) : (sc.v !== null && !sc.ko && sc.v < PLANCHER ? 'Petit nombre : pas de pourcentage' : ''),
        precLib:lib, prec: prv ? brut(val(prv, 'photos_annulees', ctx)) + ' sur ' + brut(val(prv, 'scans_lances', ctx))
          + (part(val(prv, 'part_photo_annulee_sur_scan', ctx)) ? ' · ' + part(val(prv, 'part_photo_annulee_sur_scan', ctx)) : '') : '' }),
      tuile({ nom:'Saisies à la main', aide:'pilSaisies', cur:val(cur, 'saisies_validees', ctx), sous:'traitements saisis sans scan',
        precLib:lib, prec: prv ? brut(val(prv, 'saisies_validees', ctx)) : '' }),
      tuile({ nom:'Actifs par jour', aide:'pilActifs', tag:'tests inclus', cur:val(cur, 'rc_actifs_moy_jour', ctx), unite:'en moyenne',
        sous:'selon RevenueCat', precLib:lib, prec: prv ? brut(val(prv, 'rc_actifs_moy_jour', ctx)) : '' })
    ];
    return '<div class="pil-kpi">' + t.join('') + '</div>';
  }

  // ── Le tableau ─────────────────────────────────────────────────────────────
  function tableau(pr, ctx){
    var h1 = '<tr class="pil-blocs"><th class="s" rowspan="2" scope="col">Semaine' + B.aide('Semaine', 'pilSemaine') + '</th>', h2 = '<tr>';
    for(var b = 0; b < BLOCS.length; b++){
      var bl = BLOCS[b];
      h1 += '<th class="g" colspan="' + bl.cols.length + '" scope="colgroup">' + ech(bl.nom) + B.aide(bl.nom, bl.a)
        + (bl.tag ? '<span class="tag">' + ech(bl.tag) + '</span>' : '') + '</th>';
      for(var c = 0; c < bl.cols.length; c++){
        var k = bl.cols[c], nomBulle = k.l + (k.l === 'Part' ? ' (' + bl.nom + ')' : '');
        h2 += '<th scope="col"' + (c ? '' : ' class="g"') + '><span class="pil-l">' + ech(k.l) + '</span>' + (k.tag ? '<span class="tag">' + ech(k.tag) + '</span>' : '')
          + B.aide(nomBulle, k.a) + '</th>';
      }
    }
    var corps = '';
    for(var i = 0; i < pr.lignes.length; i++){
      var l = pr.lignes[i], en = l.semaine_en_cours;
      corps += '<tr class="' + (en ? 'pil-encours' : '') + (i >= VISIBLES ? ' pil-plus' : '') + '"><th class="s" scope="row"><b>'
        + ech(P.jj_mm(l.semaine)) + '</b>' + (en ? '<span class="chip gris">en cours</span>'
        : '<small>au ' + ech(P.jj_mm(C.jourMoins(l.semaine, -6))) + '</small>') + '</th>';
      for(var b3 = 0; b3 < BLOCS.length; b3++) for(var c3 = 0; c3 < BLOCS[b3].cols.length; c3++)
        corps += '<td' + (c3 ? '' : ' class="g"') + '>' + cellule(l, BLOCS[b3].cols[c3], ctx).h + '</td>';
      corps += '</tr>';
    }
    return '<div class="pil-defil"><table class="pil-t' + (etat.tout ? ' tout' : '') + '" id="pil-table"><thead>' + h1 + '</tr>' + h2 + '</tr></thead><tbody>'
      + corps + '</tbody></table></div>';
  }

  function carteMessage(cl, titre, texte){
    return '<div class="c"><div class="titre-c">Semaine par semaine' + B.aide('Pilotage', 'pilSection') + '</div>'
      + '<div class="message pil-msg' + (cl ? ' ' + cl : '') + '"><b>' + ech(titre) + '</b> <span>' + ech(texte) + '</span></div></div>';
  }
  var etat = { tout:false, dernier:null };

  function rendre(donnees){
    if(donnees === undefined || donnees === null) return carteMessage('ko', 'Pilotage non lu.', 'La vue n’a pas été lue. N’en concluez rien : le reste du tableau de bord n’est pas concerné.');
    if(!Array.isArray(donnees)) return carteMessage('ko', 'Pilotage non lu.', 'La base a répondu : «\u00a0' + (donnees.erreur || 'réponse illisible')
      + '\u00a0». N’en concluez rien : le reste du tableau de bord n’est pas concerné. Rechargez la page ; si cela continue, à signaler tel quel.');
    if(!donnees.length) return carteMessage('', 'Aucune semaine reçue.', 'La vue a répondu sans aucune ligne : la base ne vous reconnaît peut-être pas comme administrateur pour cette vue. Ce n’est pas un zéro : n’en concluez rien.');
    var pr = preparer(donnees);
    if(pr.erreur) return carteMessage('ko', 'Pilotage non affiché.', 'Réponse incohérente : ' + pr.erreur + '. N’en concluez rien.');
    if(!pr.lignes.length) return carteMessage('ko', 'Pilotage non affiché.', 'Aucune des ' + donnees.length + ' lignes reçues n’a une semaine lisible. N’en concluez rien.');
    var ctx = { illisibles:0, manquent:{} }, h = '';
    // En-tête : la semaine en cours, jusqu'à maintenant.
    if(pr.encours){
      h += '<div class="pil-intro">' + '<span class="chip gris">Semaine du ' + ech(P.jj_mm(pr.encours.semaine)) + ' au '
        + ech(P.jj_mm(C.jourMoins(pr.encours.semaine, -6))) + ' · en cours</span><span>semaine en cours, jusqu’à maintenant</span>'
        + B.aide('Semaine en cours', 'pilEnCours') + '</div>' + chiffresCles(pr);
    } else h += '<div class="pil-intro"><span class="chip gris">Semaine en cours non reçue</span><span>les chiffres clés ne sont pas affichés ; le tableau, si.</span></div>';
    var n = pr.lignes.length, plus = n > VISIBLES;
    var tab = tableau(pr, ctx), notes = [];
    var manque = []; for(var m in ctx.manquent) if(Object.prototype.hasOwnProperty.call(ctx.manquent, m)) manque.push(m);
    if(manque.length) notes.push('<span class="message ko">Colonnes absentes de la vue : ' + ech(manque.join(', ')) + '. N’en concluez rien.</span>');
    if(ctx.illisibles) notes.push('<span class="message ko">' + ctx.illisibles + (ctx.illisibles > 1 ? ' valeurs illisibles, en rouge' : ' valeur illisible, en rouge') + ' : n’en concluez rien.</span>');
    if(pr.rejet) notes.push('<span class="message ko">' + pr.rejet + (pr.rejet > 1 ? ' lignes sans semaine lisible, mises de côté.' : ' ligne sans semaine lisible, mise de côté.') + '</span>');
    h += '<div class="c pil-tab"><div class="titre-c">Semaine par semaine' + B.aide('Pilotage semaine par semaine', 'pilSection')
      + '<span class="chip gris" id="pil-compte">' + ech(plus && !etat.tout ? VISIBLES + ' dernières semaines' : n + ' semaines') + '</span></div>'
      + tab + '<div class="pil-pied"><span class="mini">« — » : rien de reçu — zéro, ou pas encore mesuré : n’en concluez rien. Le tableau défile de côté ; la colonne des semaines reste en place.</span>'
      + (plus ? '<button type="button" class="act" data-pil-tout aria-controls="pil-table" aria-expanded="' + (etat.tout ? 'true' : 'false') + '" data-n="' + n + '">'
        + ech(etat.tout ? 'Voir les ' + VISIBLES + ' dernières' : 'Voir les ' + n + ' semaines') + '</button>' : '') + '</div>'
      + (notes.length ? '<div class="pil-notes">' + notes.join('') + '</div>' : '') + '</div>';
    return h;
  }

  // Dessine la section. Ne lève jamais. Mêmes données → rien n'est redessiné
  // (la position du tableau et « voir tout » restent quand on change de période).
  function maj(donnees){
    var el = document.getElementById('pilotage');
    if(!el || (donnees === etat.dernier && el.getAttribute('data-rendu') === 'oui')) return;
    var h;
    try { h = rendre(donnees); }
    catch(err){
      if(racine.console) racine.console.error('pilotage :', err);
      h = carteMessage('ko', 'Pilotage non affiché.', 'Cette page n’a pas su afficher ces chiffres (' + (err && err.message ? err.message : err)
        + '). C’est un défaut de la page, pas de la base ; le reste du tableau de bord n’est pas concerné.');
    }
    el.innerHTML = h;
    el.setAttribute('data-rendu', 'oui');
    etat.dernier = donnees;
  }

  // ── Écouteurs posés une fois (délégués) ────────────────────────────────────
  // « Voir les N semaines » : bascule une classe, sans redessiner.
  function basculer(bt){
    var t = document.getElementById('pil-table'), n = bt.getAttribute('data-n'), cpt = document.getElementById('pil-compte');
    etat.tout = !etat.tout;
    if(t) t.classList.toggle('tout', etat.tout);
    bt.setAttribute('aria-expanded', etat.tout ? 'true' : 'false');
    bt.textContent = etat.tout ? 'Voir les ' + VISIBLES + ' dernières' : 'Voir les ' + n + ' semaines';
    if(cpt) cpt.textContent = etat.tout ? n + ' semaines' : VISIBLES + ' dernières semaines';
  }
  // Bulles du tableau : en position fixe (le tableau défile, il les couperait),
  // placées sous le « ? », tenues dans l'écran. Ouverture/fermeture : td-bulles.js.
  function placer(aide){
    var bt = aide.querySelector('.q'), bu = aide.querySelector('.bulle');
    if(!bt || !bu) return;
    var r = bt.getBoundingClientRect(), w = bu.offsetWidth || 340, hh = bu.offsetHeight || 0;
    var vw = document.documentElement.clientWidth || racine.innerWidth, vh = racine.innerHeight;
    var g = Math.max(8, Math.min(r.left - 12, vw - w - 8)), haut = r.bottom + 8 + hh > vh - 8 && r.top - 8 - hh > 8;
    bu.style.left = Math.round(g) + 'px';
    bu.style.top = Math.round(haut ? r.top - 8 - hh : r.bottom + 8) + 'px';
    bu.classList.toggle('haut', haut);
  }
  function aideDuTableau(t){ var a = t && t.closest ? t.closest('.aide') : null; return a && a.closest('.pil-t') ? a : null; }
  function replacer(){
    var a = document.querySelectorAll('.pil-t .aide');
    for(var i = 0; i < a.length; i++) if(a[i].matches(':hover') || a[i].matches(':focus-within')) placer(a[i]);
  }
  function installer(){
    document.addEventListener('click', function(e){
      var bt = e.target && e.target.closest ? e.target.closest('[data-pil-tout]') : null;
      if(bt) basculer(bt);
    });
    document.addEventListener('mouseover', function(e){ var a = aideDuTableau(e.target); if(a) placer(a); });
    document.addEventListener('focusin', function(e){ var a = aideDuTableau(e.target); if(a) placer(a); });
    racine.addEventListener('scroll', replacer, true);
    racine.addEventListener('resize', replacer);
  }
  installer();

  racine.TDPilotage = { maj:maj, rendre:rendre, COLONNES:COLONNES, VISIBLES:VISIBLES, etat:etat };
})(window);
