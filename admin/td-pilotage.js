/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.3) — HISTORIQUE SEMAINE PAR SEMAINE
 * ============================================================================
 * Lit `v_admin_entonnoir_semaine` (27 lignes, une par lundi, 182 jours), lue
 * par td-donnees.js avec les autres vues (même session, même jeton), en vue
 * FACULTATIVE : son échec n'éteint que ce qui s'en sert, jamais la page.
 * Deux usages :
 *  1. le tableau d'historique : une ligne par semaine TERMINÉE (la semaine en
 *     cours n'est qu'en haut, une seule fois) ; l'essentiel par défaut (15
 *     colonnes, 8 semaines, sans les semaines vides d'avant la première semaine
 *     mesurée), tout derrière « Tout afficher » ;
 *  2. `semaines()` et `somme()` : la même vue, lue EN DIRECT (semaine en cours
 *     comprise), pour les cartes du haut « Pilulier créé », « Scan
 *     d'ordonnance » et la ligne « jours d'utilisation » (td-cartes.js).
 * RÈGLES (celles de td-cartes.js) :
 *  - toute donnée passe par `ech` ; null → « — » gris, jamais 0 ; valeur
 *    illisible ou colonne absente → « — » rouge, comptée et signalée ;
 *  - parts = fractions (0.262 → « 26 % ») ; pas de pourcentage sous 10 ;
 *    premiers traitements masqués sous 10 acceptations 1.4.19+ (AIPD n° 5,
 *    même règle que la carte « Pilulier créé ») ;
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
  function ess(o){ o.e = true; return o; }              // colonne affichée par défaut (l'essentiel)
  var BLOCS = [
    { nom:'Arrivées', a:'pilArrivees', cols:[
      rc(col('rc_nouveaux', 'Ouvertures (RC)', 'n', 'pilRc')), rc(col('rc_actifs_moy_jour', 'Actifs par jour (RC)', 'd', 'pilActifs')),
      col('entrees', 'Entrées', 'n', 'pilEntrees'),
      ess(col('acceptations', 'Acceptations', 'n', 'pilAcc')), col('acceptations_v2', 'dont 1.4.19 et plus', 'n', 'pilAccV2'),
      col('part_acceptation_sur_rc', 'Part sur RC', 'p', 'pilPartAcc', 'rc_nouveaux')] },
    { nom:'Activation', a:'pilActivation', cols:[
      ess(col('premiers_traitements', 'Premiers traitements', 'n', 'pilPt', 'acceptations_v2')),
      ess(col('part_premier_traitement_sur_acceptation_v2', 'Part', 'p', 'pilPartPt', 'acceptations_v2'))] },
    { nom:'Retour', a:'pilRetour', cols:[
      ess(col('retour_j1', 'Lendemain', 'n', 'pilJ1')), ess(col('retour_j2_7', '2ᵉ–7ᵉ jour', 'n', 'pilJ27')),
      ess(col('retour_j8_30', '8ᵉ–30ᵉ jour', 'n', 'pilJ830')), col('jours_ouverture_moins_7j', 'Jours d’utilisation < 7 j', 'n', 'pilOuvR'),
      col('jours_ouverture_7j_et_plus', 'Jours d’utilisation ≥ 7 j', 'n', 'pilOuvA')] },
    { nom:'Scan', a:'pilScan', cols:[
      ess(col('scans_lances', 'Scans lancés', 'n', 'pilScans')), ess(col('photos_annulees', 'Photos annulées', 'n', 'pilPhotos')),
      ess(col('part_photo_annulee_sur_scan', 'Part', 'p', 'pilPartPhoto', 'scans_lances')),
      col('listes_recues', 'Listes reçues', 'n', 'pilListes'), ess(col('listes_validees', 'Enregistrées', 'n', 'pilValidees')),
      ess(col('listes_corrigees', 'Corrigées', 'n', 'pilCorrigees')),
      col('part_liste_corrigee_sur_validee', 'Part', 'p', 'pilPartCorr', 'listes_validees'),
      ess(col('saisies_validees', 'Saisies à la main', 'n', 'pilSaisies'))] },
    { nom:'Scan · serveur', a:'pilServeur', tag:'tests inclus', cols:[
      col('serveur_listes', 'Listes', 'n', 'pilSrvListes'), col('serveur_listes_vides', 'Vides', 'n', 'pilSrvVides'),
      col('serveur_refus_limite', 'Refus (limite)', 'n', 'pilSrvRefus'), col('serveur_echecs', 'Échecs', 'n', 'pilSrvEchecs')] },
    { nom:'Abonnement', a:'pilAbonnement', cols:[
      ess(col('ecran_abonnement', 'Écran vu', 'n', 'pilEcran')), col('quota_atteint', 'Quota atteint', 'n', 'pilQuota'),
      ess(col('achats_payants', 'Achats payants', 'n', 'pilAchats')), col('essais_commences', 'Essais', 'n', 'pilEssais'),
      col('renouvellements', 'Renouvellements', 'n', 'pilRenouv'), ess(col('encaisse_brut_eur', 'Encaissé brut', 'e', 'pilEncaisse')),
      col('encaissements_autre_devise', 'Autres devises', 'n', 'pilDevises')] },
    { nom:'À partir de la 1.4.32', a:'pilV432', cols:[
      col('jours_ouverture_7_30j', 'Jours d’utilisation 7–30 j', 'n', 'pilOuvM'), col('jours_ouverture_31_90j', 'Jours d’utilisation 31–90 j', 'n', 'pilOuvT'),
      col('jours_ouverture_plus_90j', 'Jours d’utilisation > 90 j', 'n', 'pilOuvL'),
      col('jours_ouverture_anciennete_inconnue', 'Jours d’utilisation, ancienneté inconnue', 'n', 'pilOuvI'),
      col('installations_presentes', 'Présentes', 'n', 'pilPresentes'), col('presentes_moins_7j', 'Présentes < 7 j', 'n', 'pilPresTranche'),
      col('presentes_7_30j', 'Présentes 7–30 j', 'n', 'pilPresTranche'), col('presentes_31_90j', 'Présentes 31–90 j', 'n', 'pilPresTranche'),
      col('presentes_plus_90j', 'Présentes > 90 j', 'n', 'pilPresTranche'),
      col('presentes_anciennete_inconnue', 'Présentes inconnue', 'n', 'pilPresTranche'),
      col('presentes_avec_rappels_autorises', 'Avec rappels', 'n', 'pilRappels'),
      col('part_presentes_avec_rappels', 'Part', 'p', 'pilPartRappels', 'installations_presentes')] }
  ];
  var COLONNES = ['semaine', 'semaine_en_cours'], COL = {};
  for(var b = 0; b < BLOCS.length; b++){
    BLOCS[b].nEss = 0;
    for(var c = 0; c < BLOCS[b].cols.length; c++){
      var k0 = BLOCS[b].cols[c];
      COLONNES.push(k0.c); COL[k0.c] = k0;
      if(k0.e){ if(!BLOCS[b].nEss) k0.premiereEss = true; BLOCS[b].nEss++; }
    }
  }

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
    var out = { lignes:[], rejet:0, encours:null, erreur:null, par:{} };
    for(var i = 0; i < donnees.length; i++){
      var l = donnees[i];
      if(!l || typeof l !== 'object' || !C.jourValide(l.semaine) || C.lundiDe(l.semaine) !== l.semaine
         || typeof l.semaine_en_cours !== 'boolean'){ out.rejet++; continue; }
      if(out.par[l.semaine]) return { erreur:'la semaine du ' + P.jj_mm(l.semaine) + ' revient deux fois' };
      out.par[l.semaine] = l;
      if(l.semaine_en_cours){
        if(out.encours) return { erreur:'deux semaines sont marquées « en cours »' };
        out.encours = l;
      }
      out.lignes.push(l);
    }
    out.lignes.sort(function(a, z){ return a.semaine < z.semaine ? 1 : (a.semaine > z.semaine ? -1 : 0); });
    if(out.encours && out.lignes[0] !== out.encours) return { erreur:'la semaine en cours n’est pas la plus récente' };
    // Historique = semaines TERMINÉES (la semaine en cours est en haut). L'essentiel :
    // les 8 plus récentes, sans les semaines sans aucun chiffre essentiel d'avant la
    // première semaine qui en a (avant la mise en service de la mesure).
    out.closes = out.lignes.filter(function(l){ return !l.semaine_en_cours; });
    var premiere = null;
    for(var j = 0; j < out.closes.length; j++) if(aDesEssentiels(out.closes[j])) premiere = out.closes[j].semaine;
    out.essentiel = out.closes.filter(function(l){ return premiere !== null && l.semaine >= premiere; }).slice(0, VISIBLES);
    return out;
  }

  function aDesEssentiels(l){
    for(var k in COL) if(COL.hasOwnProperty(k) && COL[k].e){ var r = lire(l, k, COL[k].t); if(r.ko || r.v !== null) return true; }
    return false;
  }

  // ── Pour les cartes du haut : la vue lue en direct ─────────────────────────
  // `semaines(d)` : { par:{ lundi: ligne } } ou { cause }. Mise en cache par tableau reçu.
  var cache = { d:null, r:null };
  function semaines(donnees){
    if(donnees === cache.d && cache.r) return cache.r;
    var r;
    if(donnees === undefined || donnees === null) r = { cause:'la vue de l’historique n’a pas été lue' };
    else if(!Array.isArray(donnees)) r = { cause:'la vue de l’historique n’a pas répondu (' + (donnees.erreur || 'réponse illisible') + ')' };
    else if(!donnees.length) r = { cause:'la vue de l’historique n’a rendu aucune semaine' };
    else { var pr = preparer(donnees); r = pr.erreur ? { cause:pr.erreur } : { par:pr.par, rejet:pr.rejet }; }
    cache.d = donnees; cache.r = r;
    return r;
  }
  // Somme d'une colonne sur des semaines : { v (null si aucune valeur), ko, hors,
  // sans (semaines sans valeur), masque (premiers traitements : une semaine sous 10) }.
  function somme(e, sem, nom){
    var k = COL[nom], o = { v:null, ko:false, hors:false, sans:0, masque:false };
    for(var i = 0; i < sem.length; i++){
      var l = e.par[sem[i]];
      if(!l){ o.hors = true; continue; }
      var r = lire(l, nom, k.t);
      if(r.ko){ o.ko = true; continue; }
      if(k.base){
        var bs = lire(l, k.base, 'n');
        // Une semaine masquée (base sous 10) masque toute somme qui la contient :
        // sinon on la retrouverait par soustraction.
        if(!bs.ko && bs.v !== null && bs.v > 0 && bs.v < PLANCHER) o.masque = true;
        if(r.v !== null && (bs.ko || bs.v === null || bs.v < PLANCHER)) o.masque = true;
      }
      if(r.v === null){ o.sans++; continue; }
      o.v = (o.v || 0) + r.v;
    }
    return o;
  }

  // ── Le tableau ─────────────────────────────────────────────────────────────
  // Deux en-têtes de bloc : l'un pour l'essentiel (colonnes par défaut), l'autre
  // pour tout ; le CSS n'en montre qu'un (les cellules masquées ne comptent pas).
  function tableau(pr, ctx){
    var h1 = '<tr class="pil-blocs"><th class="s" rowspan="2" scope="col">Semaine' + B.aide('Semaine', 'pilSemaine') + '</th>', h2 = '<tr>';
    function tete(bl, n, cl){
      return '<th class="g ' + cl + '" colspan="' + n + '" scope="colgroup">' + ech(bl.nom) + B.aide(bl.nom, bl.a)
        + (bl.tag ? '<span class="tag">' + ech(bl.tag) + '</span>' : '') + '</th>';
    }
    function classes(k, c){ var o = []; if(!c) o.push('g'); if(k.premiereEss) o.push('g-ess'); if(!k.e) o.push('pil-x'); return o.length ? ' class="' + o.join(' ') + '"' : ''; }
    for(var b = 0; b < BLOCS.length; b++){
      var bl = BLOCS[b];
      if(bl.nEss) h1 += tete(bl, bl.nEss, 'pil-ess');
      h1 += tete(bl, bl.cols.length, 'pil-x');
      for(var c = 0; c < bl.cols.length; c++){
        var k = bl.cols[c], nomBulle = k.l + (k.l === 'Part' ? ' (' + bl.nom + ')' : '');
        h2 += '<th scope="col"' + classes(k, c) + '><span class="pil-l">' + ech(k.l) + '</span>' + (k.tag ? '<span class="tag">' + ech(k.tag) + '</span>' : '')
          + B.aide(nomBulle, k.a) + '</th>';
      }
    }
    var corps = '';
    for(var i = 0; i < pr.closes.length; i++){
      var l = pr.closes[i];
      corps += '<tr' + (pr.essentiel.indexOf(l) < 0 ? ' class="pil-plus"' : '') + '><th class="s" scope="row"><b>'
        + ech(P.jj_mm(l.semaine)) + '</b><small>au ' + ech(P.jj_mm(C.jourMoins(l.semaine, -6))) + '</small></th>';
      for(var b3 = 0; b3 < BLOCS.length; b3++) for(var c3 = 0; c3 < BLOCS[b3].cols.length; c3++)
        corps += '<td' + classes(BLOCS[b3].cols[c3], c3) + '>' + cellule(l, BLOCS[b3].cols[c3], ctx).h + '</td>';
      corps += '</tr>';
    }
    return '<div class="pil-defil"><table class="pil-t' + (etat.tout ? ' tout' : '') + '" id="pil-table"><thead>' + h1 + '</tr>' + h2 + '</tr></thead><tbody>'
      + corps + '</tbody></table></div>';
  }

  function carteMessage(cl, titre, texte){
    return '<div class="c"><div class="message pil-msg' + (cl ? ' ' + cl : '') + '"><b>' + ech(titre) + '</b> <span>' + ech(texte) + '</span></div></div>';
  }
  var etat = { tout:false, dernier:null };
  function pluriel(n){ return n + (n > 1 ? ' semaines terminées' : ' semaine terminée'); }
  function libelleEtendue(n, e){ return etat.tout ? 'Tout, ' + pluriel(n) : 'L’essentiel, ' + (e ? pluriel(e) : 'aucune semaine terminée mesurée'); }
  function libelleBouton(){ return etat.tout ? 'Afficher l’essentiel' : 'Tout afficher'; }

  function rendre(donnees){
    if(donnees === undefined || donnees === null) return carteMessage('ko', 'Historique non lu.', 'La vue n’a pas été lue. N’en concluez rien : le reste du tableau de bord n’est pas concerné.');
    if(!Array.isArray(donnees)) return carteMessage('ko', 'Historique non lu.', 'La base a répondu : « ' + (donnees.erreur || 'réponse illisible')
      + ' ». N’en concluez rien. Rechargez la page ; si cela continue, à signaler tel quel.');
    if(!donnees.length) return carteMessage('', 'Aucune semaine reçue.', 'La vue a répondu sans aucune ligne : la base ne vous reconnaît peut-être pas comme administrateur pour cette vue. Ce n’est pas un zéro : n’en concluez rien.');
    var pr = preparer(donnees);
    if(pr.erreur) return carteMessage('ko', 'Historique non affiché.', 'Réponse incohérente : ' + pr.erreur + '. N’en concluez rien.');
    if(!pr.lignes.length) return carteMessage('ko', 'Historique non affiché.', 'Aucune des ' + donnees.length + ' lignes reçues n’a une semaine lisible. N’en concluez rien.');
    if(!pr.closes.length) return carteMessage('', 'Aucune semaine terminée.', 'La semaine en cours est en haut de la page.');
    var ctx = { illisibles:0, manquent:{} }, n = pr.closes.length, e = pr.essentiel.length;
    var tab = tableau(pr, ctx), notes = [];
    var manque = []; for(var m in ctx.manquent) if(Object.prototype.hasOwnProperty.call(ctx.manquent, m)) manque.push(m);
    if(manque.length) notes.push('<span class="message ko">Colonnes absentes de la vue : ' + ech(manque.join(', ')) + '. N’en concluez rien.</span>');
    if(ctx.illisibles) notes.push('<span class="message ko">' + ctx.illisibles + (ctx.illisibles > 1 ? ' valeurs illisibles, en rouge' : ' valeur illisible, en rouge') + ' : n’en concluez rien.</span>');
    if(pr.rejet) notes.push('<span class="message ko">' + pr.rejet + (pr.rejet > 1 ? ' lignes sans semaine lisible, mises de côté.' : ' ligne sans semaine lisible, mise de côté.') + '</span>');
    return '<div class="c pil-tab"><div class="titre-c"><span id="pil-compte">' + ech(libelleEtendue(n, e)) + '</span>' + B.aide('Historique semaine par semaine', 'pilSection')
      + '<button type="button" class="act" data-pil-tout aria-controls="pil-table" aria-expanded="' + (etat.tout ? 'true' : 'false') + '" data-n="' + n + '" data-e="' + e + '">'
      + ech(libelleBouton()) + '</button></div>'
      + tab + '<div class="pil-pied"><span class="mini">« — » : rien de reçu — zéro, ou pas encore mesuré : n’en concluez rien. Le tableau défile de côté ; la colonne des semaines reste en place.</span></div>'
      + (notes.length ? '<div class="pil-notes">' + notes.join('') + '</div>' : '') + '</div>';
  }

  // Dessine la section. Ne lève jamais. Mêmes données → rien n'est redessiné
  // (la position du tableau et « Tout afficher » restent quand on change de période).
  function maj(donnees){
    var el = document.getElementById('pilotage');
    if(!el || (donnees === etat.dernier && el.getAttribute('data-rendu') === 'oui')) return;
    var h;
    try { h = rendre(donnees); }
    catch(err){
      if(racine.console) racine.console.error('pilotage :', err);
      h = carteMessage('ko', 'Historique non affiché.', 'Cette page n’a pas su afficher ces chiffres (' + (err && err.message ? err.message : err)
        + '). C’est un défaut de la page, pas de la base ; le reste du tableau de bord n’est pas concerné.');
    }
    el.innerHTML = h;
    el.setAttribute('data-rendu', 'oui');
    etat.dernier = donnees;
  }

  // ── Écouteurs posés une fois (délégués) ────────────────────────────────────
  // « Tout afficher » : bascule une classe (colonnes et semaines), sans redessiner.
  function basculer(bt){
    var t = document.getElementById('pil-table'), cpt = document.getElementById('pil-compte');
    etat.tout = !etat.tout;
    if(t) t.classList.toggle('tout', etat.tout);
    bt.setAttribute('aria-expanded', etat.tout ? 'true' : 'false');
    bt.textContent = libelleBouton();
    if(cpt) cpt.textContent = libelleEtendue(Number(bt.getAttribute('data-n')), Number(bt.getAttribute('data-e')));
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

  racine.TDPilotage = { maj:maj, rendre:rendre, semaines:semaines, somme:somme, COLONNES:COLONNES, VISIBLES:VISIBLES, etat:etat };
})(window);
