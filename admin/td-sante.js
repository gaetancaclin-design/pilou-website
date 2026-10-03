/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — SANTÉ TECHNIQUE, LUE DANS LA CONSOLE DÉTAILLÉE
 * ============================================================================
 * On ne RECALCULE pas l'état technique : la console détaillée (index.html, même
 * origine, même session) est chargée dans un cadre caché ; on attend que son
 * bandeau `#etat-console` sorte de l'état « chargement », puis on lit, VOYANT
 * PAR VOYANT, ce qui est rouge ou orange, pour le NOMMER.
 * Règles (revue adverse du 03/10) :
 *  - un élément attendu introuvable ou un texte non reconnu = GRIS « non lu »,
 *    jamais vert ;
 *  - une pastille prend le PIRE de ses sources (ex. Collecte = grille + bouton) ;
 *  - seule différence voulue avec le bandeau : les « attentes de données » (un
 *    taux sur 4 semaines pas encore calculable parce que la semaine manquante
 *    est ANTÉRIEURE à la première semaine mesurée) ne sont pas comptées
 *    (décision du chef de produit) — la pastille Mesure est alors GRISE ;
 *  - bandeau coloré sans aucune pastille à son niveau = incohérence : la
 *    pastille générale garde la couleur du bandeau et renvoie à la console.
 * Cadre en échec, connexion demandée ou délai (25 s dès l'ajout du cadre) :
 * gris. Si la console détaillée s'éteint dans le cadre, les réglages qu'elle
 * remet à zéro sont restaurés (ils appartiennent à Gaétan, pas au cadre).
 * ES5 strict. Expose `TDSante`.
 * ========================================================================== */
(function(racine){
  'use strict';

  var DELAI_MS = 25000, PAS_MS = 250;
  var CLES_ANCIENNE = ['pilou.console.parcours.filtre', 'pilou.console.accueil.periode', 'pilou.console.sections.ouvertes'];
  // Voyants de la grille « Alertes » → pastille. Un voyant inconnu n'est JAMAIS
  // perdu : il va dans « Autres », sous son propre nom.
  var GRILLE = {
    'Quarantaine non rejouée':'paiements', 'Alarme quarantaine':'paiements', 'Migration du 13/09':'paiements',
    'Comptes sur le projet':'securite',
    'Octrois de code':'codes', 'Migration du 23/09':'codes', 'Codes officine sur iPhone':'codes',
    'Codes à quota épuisé':'codes',
    'Scan d’ordonnance':'scanServeur',
    'Continuité de l’archive':'collecte', 'Libellés d’audience':'collecte'
  };
  var ORDRE = ['paiements', 'revenus', 'securite', 'codes', 'scanServeur', 'mesure', 'collecte', 'sauvegarde'];
  var NOMS = { paiements:'Paiements', revenus:'Revenus', securite:'Sécurité du compte', codes:'Codes officine',
    scanServeur:'Scan (serveur)', mesure:'Mesure', collecte:'Collecte', sauvegarde:'Sauvegarde' };
  var MINUSCULE = { paiements:'paiements', revenus:'revenus', securite:'sécurité du compte', codes:'codes officine',
    scanServeur:'scan', mesure:'mesure', collecte:'collecte', sauvegarde:'sauvegarde' };
  var RANG = { ok:0, gris:1, attention:2, critique:3 };

  function pire(a, b){ return RANG[b] > RANG[a] ? b : a; }
  // Élément absent = « gris » (non lu), JAMAIS « ok ».
  function etatDe(el){
    if(!el) return 'gris';
    var c = ' ' + el.className + ' ';
    return c.indexOf(' critique ') >= 0 ? 'critique' : (c.indexOf(' attention ') >= 0 ? 'attention' : 'ok');
  }
  function texte(el){ return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function premierTexte(el){
    if(!el) return '';
    for(var i = 0; i < el.childNodes.length; i++)
      if(el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.replace(/\s/g, '')) return el.childNodes[i].nodeValue.trim();
    return texte(el);
  }
  function plusJours(j, n){ return new Date(Date.parse(j + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function nouvelle(){ return { etat:'ok', valeur:'', nonLu:false }; }
  function nonLu(p){ p.nonLu = true; p.etat = pire(p.etat, 'gris'); }

  // ctx = { premiere : lundi de la première semaine mesurée (lignes de production),
  //   trou : vrai si une semaine entre celle-là et la dernière semaine close n'a
  //   AUCUNE ligne de production, derniereClose : lundi de la dernière semaine close }.
  // « Attente » SEULEMENT si : pas de trou, ET la fenêtre de l'ancienne console
  // finit à la dernière semaine close (titre « jusqu'à celle du … » ; illisible =
  // pas d'attente), ET la semaine absente précède la première semaine mesurée.
  // Sinon tout reste orange : une semaine récente perdue (ou n'ayant que nos
  // tests) ne se cache pas derrière le recul de la fenêtre (contre-revue).
  var NOMS_TAUX = [[/8ᵉ au 30ᵉ/, 'retour du 8ᵉ au 30ᵉ jour', 3], [/2ᵉ au 7ᵉ/, 'retour du 2ᵉ au 7ᵉ jour', 1],
    [/lendemain/, 'retour le lendemain', 0]];
  function lireDocument(doc, ctx){
    ctx = ctx || {};
    var premiere = ctx.trou ? null : ctx.premiere;
    var e = doc.getElementById('etat-console'), t = doc.getElementById('etat-texte');
    if(!e || !t) return { gris:true, raison:'bandeau introuvable' };
    var classe = etatDe(e), titre = texte(t.querySelector('b'));
    if(!/\b(ok|attention|critique)\b/.test(e.className)) return { gris:true, raison:'bandeau illisible' };
    var o = { general:classe, titre:titre, texte:texte(t), pastilles:{}, autres:[], fermee:false, structurel:0 };
    if(/CONSOLE FERMÉE|LECTURE IMPOSSIBLE|AFFICHAGE IMPOSSIBLE/.test(titre)){ o.fermee = true; return o; }
    var P = o.pastilles, k, i;
    for(i = 0; i < ORDRE.length; i++) P[ORDRE[i]] = nouvelle();

    // 1. La grille « Alertes ».
    var inds = doc.querySelectorAll('#grille-alertes .ind'), grilleCollecte = { etat:'ok', valeur:'' };
    if(!inds.length){ nonLu(P.paiements); nonLu(P.securite); nonLu(P.codes); nonLu(P.scanServeur); }
    for(i = 0; i < inds.length; i++){
      var nom = premierTexte(inds[i].querySelector('.quoi')), et = etatDe(inds[i]), val = texte(inds[i].querySelector('.valeur'));
      if(nom === 'Alertes'){                       // grille entière illisible ou en panne
        P.paiements.etat = pire(P.paiements.etat, et); P.securite.etat = pire(P.securite.etat, et);
        P.codes.etat = pire(P.codes.etat, et); P.scanServeur.etat = pire(P.scanServeur.etat, et);
      } else if(GRILLE[nom] === 'collecte'){
        if(RANG[et] > RANG[grilleCollecte.etat]) grilleCollecte = { etat:et, valeur: nom === 'Libellés d’audience' ? 'libellés ' + val : val };
      } else if(GRILLE[nom]){
        P[GRILLE[nom]].etat = pire(P[GRILLE[nom]].etat, et);
        if(GRILLE[nom] === 'scanServeur' && et !== 'ok') P.scanServeur.valeur = val;
      } else if(et !== 'ok') o.autres.push({ nom:nom, etat:et });
    }
    // 2. Revenus (section Argent) : `.c3-rouge` = rouge ; `.rien.avert`, `.c3-orange`,
    // case orange = orange (c3-revenus.js) — sauf « non lus » (index.html, module absent) = rouge.
    var c3 = doc.getElementById('c3-argent');
    if(!c3) nonLu(P.revenus);
    else if(c3.querySelector('.c3-rouge') || /non lus/.test(texte(c3.querySelector('.rien.avert')))) P.revenus.etat = 'critique';
    else if(c3.querySelector('.rien.avert, .c3-orange, td.attention')) P.revenus.etat = 'attention';
    // 3. Les deux échéances ; la Collecte prend le PIRE de la grille et du bouton.
    var tc = doc.getElementById('tache-collecte'), dc = doc.getElementById('haut-delai-collecte');
    if(!tc || !dc || !texte(dc)) nonLu(P.collecte);
    else {
      var eb = etatDe(tc);
      P.collecte.etat = pire(eb, grilleCollecte.etat);
      P.collecte.valeur = RANG[grilleCollecte.etat] > RANG[eb] ? grilleCollecte.valeur : texte(dc);
    }
    var ts = doc.getElementById('tache-sauvegarde'), ds = doc.getElementById('haut-delai-sauvegarde');
    if(!ts || !ds || !texte(ds)) nonLu(P.sauvegarde);
    else { P.sauvegarde.etat = etatDe(ts); P.sauvegarde.valeur = texte(ds); }
    // 4. La mesure : avertissements, puis taux sur 4 semaines (rétention, premier traitement).
    var M = P.mesure, av = doc.getElementById('cadre-mesure-avert'), rt = doc.getElementById('cadre-mesure-retention');
    M.refus = 0; M.motif = ''; M.motifs = []; M.dates = [];
    function motif(t){ if(M.motifs.indexOf(t) < 0) M.motifs.push(t); if(!M.motif) M.motif = t; }
    if(!av || !rt) nonLu(M);
    else {
      var at = texte(av);
      if(at){
        var reconnu = false, mr = /(\d+) charge\(s\) rejetée\(s\)/.exec(at);
        if(/NON AFFICHÉ/.test(at)){ M.etat = 'critique'; M.motif = 'non lue'; reconnu = true; }
        if(mr){ M.etat = 'critique'; M.refus = Number(mr[1]); reconnu = true; }
        else if(/rejet/i.test(at)){ nonLu(M); M.motif = 'refus illisibles'; reconnu = true; }
        if(/Clés inconnues/.test(at)){ M.etat = pire(M.etat, 'attention'); motif('noms inconnus'); reconnu = true; }
        if(/Deux étages/.test(at)){ M.etat = pire(M.etat, 'attention'); motif('étapes non prouvées'); reconnu = true; }
        if(!reconnu){ nonLu(M); M.motif = 'avertissement non reconnu'; }
      }
      var fen = /jusqu’à celle du (\d{2})\/(\d{2})\/(\d{2})/.exec(texte(rt));
      M.finAncienne = fen ? '20' + fen[3] + '-' + fen[2] + '-' + fen[1] : null;
      if(!M.finAncienne || M.finAncienne !== ctx.derniereClose) premiere = null;   // fenêtre reculée : pas d'attente
      var lignes = rt.querySelectorAll('tbody tr');
      M.attentes = [];
      for(i = 0; i < lignes.length; i++){
        var lt = texte(lignes[i]);
        if(/sans aucune remontée/.test(lt)){
          var w = /semaine du (\d{2})\/(\d{2})\/(\d{2})/.exec(lt), iso = w ? '20' + w[3] + '-' + w[2] + '-' + w[1] : null;
          if(iso && premiere && iso < premiere){
            var nomT = 'premier pilulier', dec = 0;
            for(var q = 0; q < NOMS_TAUX.length; q++) if(NOMS_TAUX[q][0].test(lt)){ nomT = NOMS_TAUX[q][1]; dec = NOMS_TAUX[q][2]; break; }
            o.structurel++; M.dates.push(plusJours(premiere, 7 * (4 + dec)));
            M.attentes.push({ nom:nomT, date:plusJours(premiere, 7 * (4 + dec)) });
          } else { M.etat = pire(M.etat, 'attention'); motif(iso ? 'semaine du ' + iso.slice(8, 10) + '/' + iso.slice(5, 7) + ' sans remontée' : 'taux incomplets'); }
        } else if(/plus de retours|plus de premiers traitements/.test(lt)){
          M.etat = pire(M.etat, 'attention'); motif('taux incomplets');
        }
      }
      M.dates.sort();
      M.attentes.sort(function(a, b){ return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
      M.tousEnAttente = M.attentes.length === lignes.length;
      if(M.etat === 'ok' && o.structurel) M.attente = M.dates[0];
    }
    // 5. Hors santé technique, mais compté par le bandeau.
    var ill = doc.querySelectorAll('#accueil-tuiles .acc-tuile.illisible').length;
    if(ill) o.autres.push({ nom:'accueil de la console détaillée', etat:'critique' });
    if(doc.querySelectorAll('#resume .res.alerte').length) o.autres.push({ nom:'compteurs détaillés', etat:'attention' });

    // 6. Niveau et nombre : ceux du bandeau, moins les seules attentes de données.
    var n = /^(\d+)/.exec(titre);
    o.nombreAncien = n ? Number(n[1]) : 0;
    o.nombre = o.nombreAncien;
    if(classe === 'attention'){ o.nombre -= o.structurel; if(o.nombre <= 0){ o.nombre = 0; o.general = 'ok'; } }
    // Cohérence : jamais vert au-dessus d'une pastille colorée ; jamais coloré sans nom.
    var pireVu = 'ok';
    for(k in P) if(P.hasOwnProperty(k) && P[k].etat !== 'gris') pireVu = pire(pireVu, P[k].etat);
    for(i = 0; i < o.autres.length; i++) pireVu = pire(pireVu, o.autres[i].etat);
    if(o.general === 'ok' && pireVu !== 'ok'){ o.general = pireVu; o.incoherent = true; }
    if(o.general !== 'ok' && !nomsEnAlerte(o).length) o.incoherent = true;
    o.nonLu = false;
    for(k in P) if(P.hasOwnProperty(k) && P[k].nonLu) o.nonLu = true;
    return o;
  }

  // Seulement ce qui est AU NIVEAU de la pastille générale.
  function nomsEnAlerte(o){
    var out = [];
    for(var k in MINUSCULE) if(MINUSCULE.hasOwnProperty(k) && o.pastilles[k] && o.pastilles[k].etat === o.general) out.push(MINUSCULE[k]);
    for(var i = 0; i < o.autres.length; i++) if(o.autres[i].etat === o.general) out.push(o.autres[i].nom);
    return out;
  }

  function memoriser(){
    var m = {};
    try{ for(var i = 0; i < CLES_ANCIENNE.length; i++) m[CLES_ANCIENNE[i]] = racine.localStorage.getItem(CLES_ANCIENNE[i]); }catch(e){ return null; }
    return m;
  }
  function restaurer(m){
    if(!m) return;
    try{
      for(var k in m) if(m.hasOwnProperty(k) && racine.localStorage.getItem(k) !== m[k]){
        if(m[k] === null) racine.localStorage.removeItem(k); else racine.localStorage.setItem(k, m[k]);
      }
    }catch(e){}
  }

  // Charge index.html dans un cadre caché ; promesse de l'état lu, ou de { gris, raison }.
  function lire(adresse, ctx){
    return new Promise(function(resoudre){
      var f = document.createElement('iframe'), fini = false, avant = memoriser();
      f.setAttribute('aria-hidden', 'true'); f.setAttribute('tabindex', '-1'); f.title = 'Console détaillée (lecture)';
      f.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:0;border:0;visibility:hidden';
      function finir(v){
        if(fini) return; fini = true;
        // La console détaillée ne touche à ses réglages QUE si elle s'éteint :
        // dans ce cas seulement, on remet ceux de Gaétan.
        if(v.gris || v.fermee) restaurer(avant);
        try{ f.parentNode.removeChild(f); }catch(e){}
        resoudre(v);
      }
      setTimeout(function(){ finir({ gris:true, raison:'délai dépassé' }); }, DELAI_MS);   // dès l'ajout
      function sonder(){
        if(fini) return;
        var doc = null;
        try{ doc = f.contentDocument; }catch(e){ return finir({ gris:true, raison:'cadre inaccessible' }); }
        try{
          if(doc && doc.getElementById('etat-console')){
            var co = doc.getElementById('connexion');
            if(co && co.style.display === 'grid') return finir({ gris:true, raison:'connexion demandée' });
            var cl = doc.getElementById('etat-console').className, horo = texte(doc.getElementById('horodatage'));
            if(/\b(ok|attention|critique)\b/.test(cl) && !/\bcharge\b/.test(cl) && horo !== 'chargement…')
              return finir(lireDocument(doc, ctx));
          }
        }catch(e){ return finir({ gris:true, raison:'lecture du cadre impossible' }); }
        setTimeout(sonder, PAS_MS);
      }
      f.onerror = function(){ finir({ gris:true, raison:'cadre en échec' }); };
      f.onload = function(){ setTimeout(sonder, PAS_MS); };
      f.src = adresse || 'index.html';
      document.body.appendChild(f);
    });
  }

  racine.TDSante = { lire:lire, lireDocument:lireDocument, nomsEnAlerte:nomsEnAlerte, NOMS:NOMS, ORDRE:ORDRE, pire:pire };
})(typeof window !== 'undefined' ? window : this);
