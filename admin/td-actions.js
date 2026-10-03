/* ============================================================================
 * PILOU — TABLEAU DE BORD (V4.1) — BOUTONS « ACTUALISER » ET « SAUVEGARDER »
 * ============================================================================
 * AUCUNE LOGIQUE RECOPIÉE : les deux boutons actionnent ceux de la console
 * détaillée, déjà chargée dans le cadre caché (td-sante.js, `agir`), puis lisent
 * sa zone de résultat (#collecte-resultat, #sauvegarde-resultat). Toute la
 * sécurité de l'ancienne console s'applique donc telle quelle (verrou horaire,
 * cinq contrôles de la sauvegarde, empreinte, journal).
 *  - « Actualiser » = « Collecter », puis relecture du tableau. « Session
 *    expirée » SEULEMENT sur un code HTTP 401 réellement observé.
 *  - « Sauvegarder » : la page ne peut PAS prouver que le fichier est arrivé sur
 *    le disque ; elle dit « envoyé au navigateur », avec le nom réel et
 *    l'empreinte (bulle). Hors Chrome / Edge sur ordinateur (détection prudente,
 *    navigateur inconnu = repli), le bouton devient un lien qui ouvre la
 *    console détaillée dans un nouvel onglet.
 * Verrous : actifs seulement après une lecture de santé TERMINÉE ; un seul clic
 * à la fois ; rien pendant un chargement ; au-delà de 90 s, « toujours en
 * cours… » sans réactiver tant que la console détaillée n'a pas répondu.
 * ES5 strict, `ech` sur tout texte. Expose `TDActions`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, B = racine.TDBulles, S = racine.TDSante;
  function $(id){ return document.getElementById(id); }
  function ech(s){ return C.ech(s); }
  var enCours = false, charge = true, boutons = null;
  var CL = { ok:'ok', attention:'att', critique:'ko', gris:'gris' };
  // Chrome ou Edge sur ordinateur, déclarés par le navigateur lui-même
  // (`userAgentData`). Safari, Firefox, autres dérivés de Chromium, téléphone :
  // repli (le téléchargement depuis un cadre caché n'y est pas vérifié).
  function telechargementSur(){
    try{
      var u = racine.navigator && racine.navigator.userAgentData;
      if(!u || u.mobile !== false || !u.brands || !u.brands.length) return false;
      for(var i = 0; i < u.brands.length; i++){
        var b = String(u.brands[i] && u.brands[i].brand);
        if(b === 'Google Chrome' || b === 'Microsoft Edge') return true;
      }
    }catch(e){}
    return false;
  }
  var lienSauvegarde = false;

  // Message court à l'écran ; le texte exact de la console détaillée dans la bulle.
  function dire(cl, texte, detail){
    var z = $('action-resultat');
    if(!texte){ z.innerHTML = ''; z.className = ''; return; }
    z.className = 'actres ' + cl;
    z.innerHTML = '<span class="pt"></span>' + ech(texte) + (detail && detail.length ? B.aide(texte, 'resultat', detail) : '');
  }
  function detailDe(r){
    var out = [];
    for(var i = 0; i < (r.etapes || []).length; i++) out.push('Console détaillée : « ' + r.etapes[i].texte + ' »');
    return out;
  }

  // Appelée après chaque lecture de la santé et à chaque (dé)verrouillage.
  function maj(sante, enChargement){
    charge = !!enChargement;
    if(sante && sante.pastilles && sante.pastilles.collecte && sante.pastilles.sauvegarde)
      boutons = { collecte:sante.pastilles.collecte.bouton, sauvegarde:sante.pastilles.sauvegarde.bouton };
    else if(sante) boutons = null;
    var noms = { collecte:'Actualiser', sauvegarde:'Sauvegarder' };
    for(var k in noms) if(noms.hasOwnProperty(k)){
      var b = $('act-' + k), info = boutons && boutons[k];
      b.className = 'act ' + (info ? CL[info.etat] || 'gris' : 'gris');
      $('act-delai-' + k).textContent = info && info.delai ? '· ' + (k === 'collecte' ? 'Collecte : ' : 'Sauvegarde : ') + info.delai : '';
      if(k === 'sauvegarde' && lienSauvegarde) continue;          // un lien reste toujours utilisable
      b.disabled = charge || enCours || !S.pret();
      b.setAttribute('aria-busy', enCours ? 'true' : 'false');
    }
  }

  function actualiser(){
    if(enCours || charge || !S.pret()) return;
    enCours = true; maj(undefined, charge);
    dire('gris', 'Actualisation en cours…');
    S.agir('collecte', function(){ dire('gris', 'Actualisation toujours en cours…', ['La console détaillée n’a pas encore répondu. Ne fermez pas la page ; le bouton revient dès sa réponse.']); }).then(function(r){
      var der = r.etapes[r.etapes.length - 1] || { classe:'', texte:'' }, t = der.texte, cl = der.classe;
      var res;
      if(r.etat !== 'fini') res = { cl:'ko', texte: r.etat === 'occupe' ? 'La console détaillée est occupée : réessayez dans un instant' : 'Actualisation indisponible' };
      else if(r.code === 401) res = { cl:'ko', texte:'Session expirée : reconnectez-vous dans la console détaillée' };
      else if(r.code === 409 || (r.code === null && /^Déjà collecté dans l’heure/.test(t))) res = { cl:'att', texte:'Déjà collecté dans l’heure' };
      else if(/^Collecte terminée/.test(t)) res = /partielle/.test(t) || /attention/.test(cl)
        ? { cl:'att', texte:'Chiffres actualisés en partie' } : { cl:'ok', texte:'Chiffres actualisés' };
      else res = { cl:'ko', texte:'Actualisation impossible' };
      var detail = detailDe(r).concat(r.code ? ['Code de réponse du serveur : ' + r.code + '.'] : []);
      // Dans tous les cas, le tableau relit ses chiffres.
      return racine.TDApp.charger().then(function(){ dire(res.cl, res.texte, detail); });
    }).then(fin, function(e){ dire('ko', 'Actualisation impossible', [String(e && e.message ? e.message : e)]); fin(); });
  }

  // La page ne voit pas le disque : « envoyé au navigateur », jamais « téléchargé ».
  function sauvegarder(){
    if(lienSauvegarde || enCours || charge || !S.pret()) return;
    enCours = true; maj(undefined, charge);
    dire('gris', 'Sauvegarde en cours…');
    S.agir('sauvegarde', function(){ dire('gris', 'Sauvegarde toujours en cours…', ['La console détaillée n’a pas encore rendu son résultat. Ne fermez pas la page et ne relancez rien : le bouton revient dès sa réponse.']); }).then(function(r){
      var der = r.etapes[r.etapes.length - 1] || { classe:'', texte:'' }, res;
      var fichier = r.nom ? r.nom : 'le fichier de sauvegarde (.sql)';
      var envoye = 'Fichier envoyé au navigateur : vérifiez ' + fichier + ' dans vos Téléchargements';
      var preuve = r.empreinte ? ['Empreinte SHA-256 attendue : ' + r.empreinte,
        'Vérification sous Windows : certutil -hashfile "' + (r.nom || 'fichier.sql') + '" SHA256 doit rendre cette empreinte.'] : [];
      if(r.etat !== 'fini') res = { cl:'ko', texte: r.etat === 'occupe' ? 'La console détaillée est occupée : réessayez dans un instant' : 'Sauvegarde indisponible' };
      else if(/refusée/.test(der.texte) || /critique/.test(der.classe)) res = { cl:'ko', texte:'Sauvegarde refusée' };
      // La console détaillée n'efface sa zone QUE sur un succès net (fichier
      // remis au navigateur, journal écrit, même empreinte relue).
      else if(r.efface) res = { cl:'ok', texte:envoye };
      else res = { cl:'att', texte:'À vérifier : ' + envoye.charAt(0).toLowerCase() + envoye.slice(1) };
      var detail = preuve.concat(detailDe(r));
      return racine.TDApp.charger().then(function(){ dire(res.cl, res.texte, detail); });
    }).then(fin, function(e){ dire('ko', 'Sauvegarde : erreur', [String(e && e.message ? e.message : e)]); fin(); });
  }
  function fin(){ enCours = false; maj(undefined, charge); }

  // Repli : le bouton devient un lien vers la console détaillée (nouvel onglet).
  function enLien(){
    var b = $('act-sauvegarde'), a = document.createElement('a');
    a.id = 'act-sauvegarde'; a.className = b.className; a.href = 'index.html'; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = ech('Sauvegarder (console détaillée)') + ' <span class="act-delai" id="act-delai-sauvegarde"></span>';
    b.parentNode.replaceChild(a, b);
    lienSauvegarde = true;
  }
  function installer(){
    if(!telechargementSur()) enLien();
    else $('act-sauvegarde').addEventListener('click', sauvegarder);
    $('act-collecte').addEventListener('click', actualiser);
    $('act-aide').innerHTML = B.aide('Actualiser et Sauvegarder', 'actions', lienSauvegarde
      ? ['Sur ce navigateur, « Sauvegarder » ouvre la console détaillée dans un nouvel onglet : cette page ne fait produire le fichier que sous Chrome et Edge sur ordinateur.'] : []);
    maj(null, true);
  }

  racine.TDActions = { installer:installer, maj:maj, occupe:function(){ return enCours; } };
})(window);
