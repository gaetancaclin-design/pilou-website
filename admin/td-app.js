/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — CHEF D'ORCHESTRE
 * ============================================================================
 * Période (Semaine | 4 semaines, flèches ‹ ›), interrupteur « Nos tests »,
 * chargement, rendu, santé technique. Garde-fous repris de index.html :
 *  - CONSOLE FERMÉE / LECTURE IMPOSSIBLE : aucun chiffre ;
 *  - AFFICHAGE IMPOSSIBLE si le rendu plante (le défaut est celui de la page,
 *    pas de la base ; le réglage mémorisé est remis par défaut) ;
 *  - verrou pendant le chargement (clics refusés) ; jeton anti-chevauchement
 *    (td-donnees.js) ; réglage mémorisé SEULEMENT après un rendu réussi ;
 *  - date de référence = v_admin_resume.jour_serveur, jamais l'horloge du poste
 *    (seul l'horodatage « Relevé le … » lit l'heure du poste, comme index.html).
 * ES5 strict. Expose `TDApp` (lecture seule, pour le banc).
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, P = racine.TDPeriode, B = racine.TDBulles, K = racine.TDCartes, S = racine.TDSante;
  function $(id){ return document.getElementById(id); }
  function ech(s){ return C.ech(s); }

  var CLE_TESTS = 'pilou.tableau.nos-tests';
  var etat = { mode:'semaine', fin:null, avecTest:false, d:null, J:null, charge:false, sante:null, jetonSante:0, dernier:null };
  var fmtReleve = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

  function lireTests(){ try{ etat.avecTest = racine.localStorage.getItem(CLE_TESTS) === 'oui'; }catch(e){} }
  function ecrireTests(){ try{ racine.localStorage.setItem(CLE_TESTS, etat.avecTest ? 'oui' : 'non'); }catch(e){} }
  function oublierTests(){ try{ racine.localStorage.removeItem(CLE_TESTS); }catch(e){} }

  function verrou(v){
    etat.charge = !!v;
    var b = document.querySelectorAll('.seg button, .fl, #tests');
    for(var i = 0; i < b.length; i++) b[i].disabled = etat.charge;
    if(!v) bornerFleches();
  }
  function panne(titre, texte, gris){
    $('panne').innerHTML = '<div' + (gris ? ' class="gris"' : '') + '><b>' + ech(titre) + '</b>' + ech(texte)
      + ' <a class="lien" href="index.html">Console détaillée →</a></div>';
    $('panne').style.display = 'block';
    $('contenu').classList.add('cache');
    $('releve').textContent = '';
    if(!gris) etatGeneral('ko', titre.replace(/\.\s*$/, ''), null);
  }
  function sansPanne(){ $('panne').style.display = 'none'; $('panne').innerHTML = ''; $('contenu').classList.remove('cache'); }

  function etatGeneral(cl, texte, aideCle){
    $('etat').className = 'etat ' + cl;
    $('etat-texte').textContent = texte;
    $('etat-aide').innerHTML = aideCle === null ? '' : B.aide('État général', 'etat');
  }

  // ── Chargement ─────────────────────────────────────────────────────────────
  function charger(){
    verrou(true);
    $('releve').textContent = 'chargement…';
    etatGeneral('gris', 'Lecture…', null);
    racine.TDDonnees.charger().then(function(r){
      if(!r) return;                                   // réponse périmée : on ne touche à rien
      if(r.etat === 'sans-session'){ racine.location.replace('index.html'); return; }
      verrou(false);
      if(r.etat === 'fermee') return panne('CONSOLE FERMÉE — données non lues. ', 'La base a répondu, mais elle ne vous '
        + 'reconnaît pas comme le compte administrateur. N’interprétez aucun chiffre : l’absence de données n’est '
        + 'pas une absence de problème. Reconnectez-vous depuis la console détaillée.');
      if(r.etat === 'bibliotheque') return panne('LECTURE IMPOSSIBLE. ', 'La page n’a pas pu charger sa bibliothèque '
        + '(supabase-js) : la base n’a pas été interrogée. Rechargez la page ; si cela continue, c’est un défaut de la page, '
        + 'à signaler tel quel. Aucun chiffre n’est affiché.');
      if(r.etat === 'erreur') return panne('LECTURE IMPOSSIBLE. ', 'La base n’a pas répondu comme prévu : ' + r.message
        + '. Aucun chiffre n’est affiché — mieux vaut rien qu’un chiffre faux.');
      etat.d = r.d;
      etat.J = C.jourServeurValide(r.d.resume);
      if(etat.J === null) return panne('AFFICHAGE IMPOSSIBLE. ', 'La date de la base manque : aucune période ne peut être '
        + 'calculée. Aucun chiffre n’est affiché.');
      // Semaines de PRODUCTION (test = false, clés connues, hors `rejet`) : la
      // première, un trou éventuel, et la dernière semaine close vide (contre-revue).
      var prod = P.semainesProduction(r.d.mesure);
      etat.premiere = prod.premiere;
      var g = P.trouProduction(prod.semaines, prod.premiere, etat.J);
      etat.trou = g.trou; etat.derniereVide = g.derniereVide;
      // Coupure des premiers pas (décision produit, passe 3) : 0 la dernière semaine
      // close alors que la précédente en comptait au moins 10.
      etat.premiersPasCoupes = P.premiersPasProduction(r.d.mesure, g.derniere) === 0
        && P.premiersPasProduction(r.d.mesure, C.jourMoins(g.derniere, 7)) >= P.PLANCHER;
      etat.gauche = P.premiereSemaineVisible(etat.J, r.d.audJours);
      var b = P.bornes(etat.J, etat.mode, etat.gauche);
      if(etat.fin === null || etat.fin > b.max || etat.fin < b.min) etat.fin = P.finParDefaut(etat.J);
      if(rendre()){
        $('releve').textContent = 'Relevé le ' + fmtReleve.format(new Date()).replace(' ', ' à ') + ' (heure de Paris)';
        lireSante();
      }
    });
  }

  // ── Rendu (le filet est ICI, pour tous les appelants) ──────────────────────
  function rendre(){
    try { dessiner(); sansPanne(); return true; }
    catch(err){
      var pose = etat.avecTest;
      etat.avecTest = false; oublierTests(); majTests();
      if(racine.console) racine.console.error('tableau :', err);
      panne('AFFICHAGE IMPOSSIBLE. ', 'La base a répondu, mais cette page n’a pas su afficher ces données. Ce n’est pas '
        + 'une panne de la base : c’est un défaut de cette page, à signaler tel quel. '
        + (pose ? 'Le réglage « Nos tests » était mémorisé ; il vient d’être remis par défaut. ' : '')
        + 'Détail technique : ' + (err && err.message ? err.message : err) + '. La console détaillée reste disponible.');
      return false;
    }
  }

  function dessiner(){
    var d = etat.d, J = etat.J, p = P.periode(J, etat.mode, etat.fin);
    var a = C.agregerMesure(d.mesure, etat.avecTest);
    var x = { d:d, J:J, p:p, prev:P.precedente(J, p), avecTest:etat.avecTest, a:a, premiere:etat.premiere,
              cases: a.cause ? {} : P.casesMesure(d.mesure, etat.avecTest),
              ach: P.agregerCharge(d.mesureCharge, etat.avecTest), illisibles:0 };
    $('libelle').textContent = P.libelle(p) + (p.enCours ? ' · en cours' : '');
    $('questions').innerHTML = K.questions(x);
    $('scan').innerHTML = K.scan(x);
    $('officines').innerHTML = K.officines(x);
    etat.dernier = x;
    dessinerSante();
    bornerFleches();
  }

  // ── Santé technique ────────────────────────────────────────────────────────
  var CL = { ok:'ok', attention:'att', critique:'ko', gris:'gris' };
  function lireSante(){
    var moi = ++etat.jetonSante;
    etat.sante = null; dessinerSante();
    S.lire('index.html', { premiere:etat.premiere, trou:etat.trou, derniereClose:C.jourMoins(C.lundiDe(etat.J), 7) }).then(function(r){
      if(moi !== etat.jetonSante) return;
      etat.sante = r; dessinerSante();
    });
  }
  function pastille(cle, nom, cl, extra){
    return '<span class="pastille">' + K.chip(cl, nom) + B.aide(nom.replace(/ :.*$/, ''), cle, extra) + '</span>';
  }
  // Points PROPRES à la page : { niveau, nom } chacun, comptés dans le nombre de
  // la pastille générale avec ceux de la console détaillée (rouge l'emporte).
  function propres(x){
    var out = [];
    if(!x) return out;
    if(x.illisibles) out.push({ niveau:'critique', nom:x.illisibles + (x.illisibles > 1 ? ' chiffres non lus' : ' chiffre non lu') + ' sur cette page' });
    var sm = signauxMesure();
    if(sm.length) out.push({ niveau:'attention', nom:'mesure (' + sm.join(', ') + ')', mesure:true });
    if(!x.ach.cause && x.ach.clesInconnues && x.ach.clesInconnues.length) out.push({ niveau:'attention', nom:'version 1.4.22 (nom inconnu)' });
    return out;
  }
  // Signaux propres à la page : dernière semaine close sans production ; ou bien
  // 0 premier pas de production alors que la semaine d'avant en comptait au
  // moins 10 (décision produit, passe 3 : coupure des premiers pas).
  function signauxMesure(){
    var out = [], d = P.jj_mm(C.jourMoins(C.lundiDe(etat.J), 7));
    if(etat.derniereVide) out.push('aucune remontée la semaine du ' + d);
    else if(etat.premiersPasCoupes) out.push('aucun nouvel utilisateur mesuré la semaine du ' + d);
    return out;
  }
  function libellePastille(k, ps){
    var nom = S.NOMS[k];
    if(k === 'mesure'){
      if(ps.nonLu || ps.motif === 'non lue') return 'Mesure : ' + (ps.motif === 'refus illisibles' ? 'refus illisibles' : 'non lue');
      var propresM = signauxMesure();
      // Attente : une date simple, le détail taux par taux est dans la bulle. « Premiers
      // taux » et non « taux complets » : le dernier (8ᵉ au 30ᵉ jour) arrive plus tard.
      if(ps.attente && !propresM.length) return 'Mesure : ' + (ps.attentes.length > 1 ? 'premiers taux' : 'taux') + ' dès le ' + P.jj_mm(ps.attentes[0].date);
      // TOUS les motifs, ceux de la console détaillée et ceux de la page (passe 3).
      var parts = [];
      if(ps.refus) parts.push(ps.refus + ' refus');
      parts = parts.concat(propresM, ps.motifs || []);
      return 'Mesure : ' + (parts.length ? parts.join(' · ') : '0 refus');
    }
    if(ps.nonLu) return nom + ' : non lu';
    if((k === 'collecte' || k === 'sauvegarde') && ps.valeur) return nom + ' : ' + ps.valeur;
    return nom;
  }
  function dessinerSante(){
    var s = etat.sante, x = etat.dernier, h = '', i, pr = propres(x), niveau, txt, sm = etat.J ? signauxMesure() : [];
    if(!s || s.gris || s.fermee){
      niveau = s && s.fermee ? 'critique' : 'gris';
      txt = !s ? 'État technique : lecture…' : (s.fermee ? 'Console détaillée : ' + s.titre.replace(/[.\s—]+$/, '')
        : 'État technique non lu (' + s.raison + ') — ouvrir la console détaillée');
      for(i = 0; i < pr.length; i++){ txt += ' + ' + pr[i].nom; niveau = S.pire(niveau, pr[i].niveau); }
      for(i = 0; i < S.ORDRE.length; i++) h += pastille(S.ORDRE[i], S.NOMS[S.ORDRE[i]], 'gris');
    } else {
      // Nombre = points de la console détaillée (hors attentes) + points propres à
      // la page, au niveau le plus grave (rouge l'emporte sur orange, comme le bandeau).
      var ancien = s.general === 'ok' ? 'ok' : s.general, noms = ancien === 'ok' ? [] : S.nomsEnAlerte(s);
      niveau = ancien;
      for(i = 0; i < pr.length; i++) niveau = S.pire(niveau, pr[i].niveau);
      var n = (niveau === ancien && ancien !== 'ok') ? s.nombre : 0;
      if(niveau !== ancien) noms = [];
      for(i = 0; i < pr.length; i++){
        var dejaMesure = pr[i].mesure ? noms.indexOf('mesure') : -1;
        if(dejaMesure >= 0) noms[dejaMesure] = pr[i].nom;          // « mesure » une seule fois, détaillée
        if(pr[i].niveau !== niveau) continue;                      // un orange ne compte pas sous du rouge
        n++;
        if(dejaMesure < 0) noms.push(pr[i].nom);
      }
      if(niveau === 'ok') txt = s.nonLu ? 'État technique en partie non lu — ouvrir la console détaillée' : 'Rien à signaler';
      else txt = (n || 1) + (niveau === 'critique' ? (n > 1 ? ' alertes rouges' : ' alerte rouge')
        : (n > 1 ? ' points à surveiller' : ' point à surveiller'))
        + ((niveau === ancien && s.incoherent) || !noms.length ? ' : voir la console détaillée' : ' : ' + noms.join(', '));
      if(niveau === 'ok' && s.nonLu) niveau = 'gris';
      for(i = 0; i < S.ORDRE.length; i++){
        var k = S.ORDRE[i], ps = s.pastilles[k], cl = ps.attente ? 'gris' : CL[ps.etat], extra = [];
        if(k === 'mesure' && sm.length && !ps.nonLu) cl = CL[S.pire(ps.attente ? 'ok' : ps.etat, 'attention')];
        if(k === 'mesure' && ps.attentes) for(var q = 0; q < ps.attentes.length; q++) extra.push('En attente de données : ' + ps.attentes[q].nom + ', dès le ' + P.jj_mm(ps.attentes[q].date) + '.');
        h += pastille(k, libellePastille(k, ps), cl, extra);
      }
      for(i = 0; i < s.autres.length; i++) h += pastille('autres', s.autres[i].nom, CL[s.autres[i].etat] || 'att');
    }
    etatGeneral(CL[niveau], txt, s ? 'etat' : null);
    // Signal PROPRE à cette page (la console détaillée ne lit pas cette vue).
    if(x && (x.ach.cause || (x.ach.clesInconnues && x.ach.clesInconnues.length)))
      h += pastille('recente', x.ach.cause ? 'Version 1.4.22 : non lue' : 'Version 1.4.22 : '
        + x.ach.clesInconnues.length + (x.ach.clesInconnues.length > 1 ? ' noms inconnus' : ' nom inconnu'), x.ach.cause ? 'ko' : 'att');
    $('sante').innerHTML = h + '<a class="lien" href="index.html">Console détaillée →</a>';
  }

  // ── Commandes ──────────────────────────────────────────────────────────────
  function bornerFleches(){
    if(etat.J === null || etat.fin === null) return;
    var b = P.bornes(etat.J, etat.mode, etat.gauche), pas = etat.mode === '4sem' ? 28 : 7;
    $('avant').disabled = etat.charge || C.jourMoins(etat.fin, pas) < b.min;
    $('apres').disabled = etat.charge || C.jourMoins(etat.fin, -pas) > b.max;
  }
  function deplacer(sens){
    if(etat.charge || !etat.d) return;
    var pas = etat.mode === '4sem' ? 28 : 7, b = P.bornes(etat.J, etat.mode, etat.gauche), f = C.jourMoins(etat.fin, -sens * pas);
    if(f < b.min || f > b.max) return;
    etat.fin = f; rendre();
  }
  function changerMode(m){
    if(etat.charge || !etat.d || (m !== 'semaine' && m !== '4sem') || m === etat.mode) return;
    etat.mode = m;
    var b = P.bornes(etat.J, m, etat.gauche);
    if(etat.fin > b.max) etat.fin = b.max;
    if(etat.fin < b.min) etat.fin = b.min;
    var bt = document.querySelectorAll('.seg button');
    for(var i = 0; i < bt.length; i++) bt[i].setAttribute('aria-pressed', bt[i].getAttribute('data-mode') === m ? 'true' : 'false');
    rendre();
  }
  function majTests(){
    $('tests').setAttribute('aria-checked', etat.avecTest ? 'true' : 'false');
    $('tests-lib').textContent = etat.avecTest ? 'Nos tests comptés' : 'Nos tests exclus';
  }
  function basculerTests(){
    if(etat.charge || !etat.d) return;
    etat.avecTest = !etat.avecTest; majTests();
    if(rendre()) ecrireTests();                      // mémorisé APRÈS un rendu réussi
  }

  function demarrer(){
    B.installer();
    lireTests(); majTests();
    $('tests-aide').innerHTML = B.aide('Nos tests', 'tests');
    $('avant').addEventListener('click', function(){ deplacer(-1); });
    $('apres').addEventListener('click', function(){ deplacer(1); });
    $('tests').addEventListener('click', basculerTests);
    var bt = document.querySelectorAll('.seg button');
    for(var i = 0; i < bt.length; i++) bt[i].addEventListener('click', function(ev){ changerMode(ev.currentTarget.getAttribute('data-mode')); });
    dessinerSante();
    charger();
  }

  racine.TDApp = { etat:etat, charger:charger };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})(window);
