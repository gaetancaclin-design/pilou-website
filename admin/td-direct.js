/* ============================================================================
 * PILOU — TABLEAU DE BORD (V4.1) — BANDEAU « EN DIRECT » (aujourd'hui et hier)
 * ============================================================================
 * Sources JOURNALIÈRES seulement : RevenueCat (`v_admin_audience_jours`) et le
 * scan vu par le serveur (`v_admin_scan`). Les mesures hebdomadaires de
 * l'application restent dans les cartes de la semaine : aucun mélange.
 * Jours en heure UTC à partir de `jour_serveur` (jamais l'horloge du poste),
 * MÊMES RÈGLES que les tuiles « Aujourd'hui / Hier » de index.html :
 *  - habitués = `revenants`, règles de `tuileRetour` (l. 4799-4826) : jour sans
 *    ligne, relevés manquants ou valeur absente → « — » ; négatif → « — » (non lu) ;
 *    provisoire si aujourd'hui ou si une série est marquée incomplète ;
 *  - scans réussis = `servis_probables` du jour, lignes validées par `lignesScan`
 *    (règle de `tuileScanAccueil`, l. 4894-4940 : un jour sans ligne = aucune
 *    tentative) ; une ligne illisible → « — » rouge ;
 *  - ouvertures (`nouveaux`) et actifs : un entier relevé, ou « — ».
 * ES5 strict, `ech` sur toute donnée. Expose `TDDirect`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, B = racine.TDBulles;
  function ech(s){ return C.ech(s); }

  // L'heure de Paris à laquelle commence le jour UTC `j` (copie de index.html,
  // `debutJourParis`, l. 4540-4544) : 2 h en été, 1 h en hiver.
  var fmtHeureParis = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', hour:'numeric', hourCycle:'h23' });
  function debutJourParis(j){
    return parseInt(String(fmtHeureParis.format(new Date(Date.parse(j + 'T00:00:00Z')))).replace(/\D/g, ''), 10) + ' h';
  }
  var fmtHM = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  function heureParis(iso){
    var t = Date.parse(iso);
    return isFinite(t) ? fmtHM.format(new Date(t)).replace(':', ' h ') : null;
  }

  function ligne(rows, j){
    for(var i = 0; i < (rows || []).length; i++) if(rows[i] && rows[i].jour === j) return rows[i];
    return null;
  }
  // Une valeur RevenueCat du jour : { v } ou { raison }.
  function serie(g, col){
    if(!g || !(C.entierOuNul(g[col + '_lu']) > 0) || g[col] == null) return { raison:'pas encore relevé' };
    var v = C.entierOuNul(g[col]);
    return (v === null || v < 0) ? { raison:'valeur non lue' } : { v:v };
  }
  function habitues(g){
    if(!g) return { raison:'aucune collecte ne couvre ce jour' };
    var rev = C.entierOuNul(g.revenants);
    if(!(C.entierOuNul(g.actifs_lu) > 0 && C.entierOuNul(g.nouveaux_lu) > 0) || rev === null) return { raison:'pas encore relevé' };
    if(rev < 0) return { raison:'valeur négative : journée pas entièrement relue' };
    return { v:rev };
  }

  // Les chiffres d'un jour : { ouvertures, actifs, habitues, scans, provisoire }.
  function jour(d, j, estAujourdhui){
    var g = ligne(d.audJours, j), o = { j:j };
    o.ouvertures = serie(g, 'nouveaux'); o.actifs = serie(g, 'actifs'); o.habitues = habitues(g);
    o.provisoire = estAujourdhui || !!(g && (g.actifs_incomplet === true || g.nouveaux_incomplet === true));
    var lu = C.lignesScan(d.scan);
    if(lu.cause) o.scans = { raison:lu.cause, rouge:true };
    else {
      var s = { servis:0, env:0 };
      for(var i = 0; i < lu.lignes.length; i++) if(lu.lignes[i].jour === j){ s.servis += lu.lignes[i].servis_probables; s.env += lu.lignes[i].envoyes; }
      o.scans = { v:s.servis, sur:s.env };
    }
    return o;
  }

  function nb(x, mot, plur){
    return x.v === undefined ? '— ' + ech(plur) : '<b>' + ech(String(x.v)) + '</b> ' + ech(x.v > 1 ? plur : mot);
  }
  // « N actifs, dont x nouveaux et y habitués » (actifs = nouveaux + habitués chez RevenueCat).
  function rc(o){
    if(o.actifs.v === undefined && o.ouvertures.v === undefined && o.habitues.v === undefined) return '<span class="dv">— actifs</span>';
    return '<span class="dv">' + nb(o.actifs, 'actif', 'actifs') + ', dont ' + nb(o.ouvertures, 'nouveau', 'nouveaux')
      + ' et ' + nb(o.habitues, 'habitué', 'habitués') + '</span>';
  }
  function scans(x){
    if(x.v === undefined) return '<span class="dv ko">— scan réussi</span>';
    return '<span class="dv">' + nb(x, 'scan réussi', 'scans réussis') + '</span>';
  }
  function bloc(o, titre, avant){
    return '<span class="dj">' + avant + '<span class="dt">' + ech(titre) + '</span>' + rc(o) + scans(o.scans) + '</span>';
  }
  function raisons(o, nom){
    var out = [], k = { actifs:'actifs', ouvertures:'nouveaux', habitues:'habitués', scans:'scans' };
    for(var c in k) if(k.hasOwnProperty(c) && o[c].v === undefined) out.push(nom + ', ' + k[c] + ' : ' + o[c].raison + '.');
    return out;
  }

  // HTML du bandeau. `audEtat` : v_admin_audience_etat (heure de la dernière collecte).
  function rendre(d, J, audEtat){
    var hier = C.jourMoins(J, 1), a = jour(d, J, true), h = jour(d, hier, false);
    var passe = audEtat && audEtat.dernier_passage, heure = passe ? heureParis(passe) : null;
    var dejaAuj = passe && String(new Date(Date.parse(passe)).toISOString()).slice(0, 10) >= J;
    // « Pas encore relevé » seulement si AUCUN chiffre RevenueCat du jour n'est là ;
    // l'heure seulement si la dernière collecte est bien d'aujourd'hui (UTC).
    var rienAuj = a.ouvertures.v === undefined && a.actifs.v === undefined && a.habitues.v === undefined;
    var tAuj = 'Aujourd’hui (' + (rienAuj ? 'pas encore relevé, ' : (heure && dejaAuj ? 'relevé à ' + heure + ', ' : '')) + 'provisoire)';
    var tHier = 'Hier' + (h.provisoire ? ' (provisoire)' : '');
    var extra = ['Jours en heure universelle : « aujourd’hui » a commencé à ' + debutJourParis(J) + ', heure de Paris.',
      'Actifs, nouveaux et habitués : RevenueCat, relu à chaque « Actualiser » ; nos tests sont dedans. Actifs = nouveaux (vus pour la première fois, carte « Ouvertures ») + habitués (déjà vus avant).',
      'Scans réussis : listes rendues en moins d’une minute, comptées par le serveur, nos essais compris.']
      .concat(raisons(a, 'Aujourd’hui'), raisons(h, 'Hier'));
    return bloc(a, tAuj, '<span class="dtitre">En direct' + B.aide('En direct', 'direct', extra) + '</span>') + bloc(h, tHier, '');
  }

  racine.TDDirect = { rendre:rendre, jour:jour, debutJourParis:debutJourParis, heureParis:heureParis };
})(typeof window !== 'undefined' ? window : this);
