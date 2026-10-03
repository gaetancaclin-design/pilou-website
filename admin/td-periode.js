/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — PÉRIODES ET AGRÉGATS PROPRES À LA PAGE
 * ============================================================================
 * Tout ce que l'ancienne console ne calculait pas : découpage en semaines
 * (lundi–dimanche, heure universelle), sommes d'une période, comparaison avec
 * la période précédente, lecture de `v_admin_mesure_charge` (colonne `charge`),
 * date à laquelle la rétention deviendra calculable.
 * Les calculs EXISTANTS (agregerMesure, retentionMesure, Wilson…) ne sont PAS
 * refaits ici : ils viennent de td-calculs.js, copies à l'identique.
 * Date de référence : `v_admin_resume.jour_serveur` (J), jamais l'horloge du poste.
 * ES5 strict, fonctions pures, aucune requête. Expose `TDPeriode`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc;

  // Mise en service de la mesure (texte de la console détaillée : « 21/09/2026 »).
  var MESURE_DEBUT = '2026-09-21';
  // Première semaine où la version 1.4.22 (lignes « charge 3 ») peut être lue en
  // vrai : Android publiée le 03/10 (analyse du 03/10). Sert au seul message gris.
  var V3_PREMIERE = '2026-10-05';
  // Durées de conservation des vues (définitions lues dans les migrations ; scan :
  // commentaire de la console détaillée, la définition SQL n'est pas dans le dépôt).
  var GARDE = { mesure:182, scan:14, net:62 };
  // Toutes les clés que la table accepte (contrainte CHECK, migration mesure v3).
  var CLES_TABLE = C.MESURE_JALONS.concat(C.MESURE_ECRANS, C.MESURE_SCAN, ['photo_annulee',
    'demarrage_feuille_affichee','demarrage_feuille_sans_prevenir','demarrage_saisie_choisie',
    'demarrage_rappel_demande','demarrage_plus_tard','demarrage_autorisation_accordee',
    'demarrage_autorisation_refusee','demarrage_rappel_programme','demarrage_rappel_echec',
    'demarrage_feuille_fermee_sans_choix','demarrage_rappel_touche','demarrage_rappel_annule_avant',
    'consentement_accepte','liste_validee','saisie_manuelle_validee','liste_corrigee',
    'envoi_recu','envoi_second','rejet']);

  var fmtCourt = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', day:'numeric', month:'short' });
  var fmtJourNum = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', day:'numeric' });
  function d(j){ return new Date(Date.parse(j + 'T00:00:00Z')); }
  function jj_mm(j){ return j.slice(8, 10) + '/' + j.slice(5, 7); }
  function joursEntre(debut, fin){
    var out = [], t = Date.parse(debut + 'T00:00:00Z'), tf = Date.parse(fin + 'T00:00:00Z');
    for(; t <= tf; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
    return out;
  }

  // ── Périodes ──────────────────────────────────────────────────────────────
  // `fin` = lundi de la DERNIÈRE semaine de la période. « 4 semaines » = les
  // quatre semaines qui finissent par celle-là, toujours closes.
  function periode(J, mode, fin){
    var n = mode === '4sem' ? 4 : 1, sem = [];
    for(var k = n - 1; k >= 0; k--) sem.push(C.jourMoins(fin, 7 * k));
    var dim = C.jourMoins(fin, -6), enCours = (fin === C.lundiDe(J));
    var dernier = enCours ? J : dim;
    return { mode:mode, fin:fin, semaines:sem, debut:sem[0], dimanche:dim, enCours:enCours,
             dernierJour:dernier, jours:joursEntre(sem[0], dernier), nbJours:7 * n };
  }
  function precedente(J, p){ return periode(J, p.mode, C.jourMoins(p.debut, 7)); }
  function finParDefaut(J){ return C.jourMoins(C.lundiDe(J), 7); }
  // Borne gauche : la première semaine dont au moins une source est encore dans
  // sa période conservée — la mesure (semaines > J − 182) ou l'archive RevenueCat
  // (son plus ancien jour). Les autres sources ont des fenêtres plus courtes.
  function premiereSemaineVisible(J, audJours){
    var m = C.lundiDe(C.jourMoins(J, GARDE.mesure - 1));
    if(m <= C.jourMoins(J, GARDE.mesure)) m = C.jourMoins(m, -7);
    for(var i = 0; i < (audJours || []).length; i++){
      var j = audJours[i] && audJours[i].jour;
      if(C.jourValide(j) && C.lundiDe(j) < m) m = C.lundiDe(j);
    }
    return m;
  }
  function bornes(J, mode, gauche){
    var L = C.lundiDe(J), g = gauche || C.jourMoins(L, 7 * 26);
    return { max: mode === '4sem' ? C.jourMoins(L, 7) : L, min: mode === '4sem' ? C.jourMoins(g, -21) : g };
  }
  function libelle(p){
    var a = d(p.debut), b = d(p.dimanche);
    var memeMois = p.debut.slice(0, 7) === p.dimanche.slice(0, 7);
    return (memeMois ? fmtJourNum.format(a) : fmtCourt.format(a)) + ' – ' + fmtCourt.format(b);
  }

  // ── RevenueCat, jour par jour (archive) ──────────────────────────────────
  // Un jour compte s'il a été relu (`*_lu` > 0) et porte un entier. « vide »
  // (lu, rien rendu) n'est pas zéro : non compté. Un négatif est une donnée
  // fausse : ni additionné ni compté (règle de `sommeAudience`). Une valeur
  // qui n'est pas un entier : la carte entière refuse (« un entier ou rien »).
  function audience(rows, jours, col){
    if(!Array.isArray(rows)) return { cause:'la vue n’a rien rendu' };
    var par = {};
    for(var i = 0; i < rows.length; i++){
      var r = rows[i];
      if(!r || !C.jourValide(r.jour)) return { cause:'un jour illisible' };
      if(par[r.jour]) return { cause:'le ' + C.jourTexte(r.jour) + ' apparaît deux fois' };
      par[r.jour] = r;
    }
    var s = 0, lus = 0, prov = false;
    for(var k = 0; k < jours.length; k++){
      var g = par[jours[k]];
      if(!g || !(C.entierOuNul(g[col + '_lu']) > 0) || g[col] == null) continue;
      var v = C.entierOuNul(g[col]);
      if(v === null) return { cause:'valeur illisible le ' + C.jourTexte(jours[k]) };
      if(v < 0) continue;
      s += v; lus++;
      if(g[col + '_incomplet'] === true) prov = true;
    }
    return { somme:s, lus:lus, sur:jours.length, provisoire:prov };
  }
  // Courbe : MOYENNE PAR JOUR des semaines closes (jours relus seulement), jusqu'à
  // `fin` comprise ; elle s'arrête au premier trou (une courbe qui relie un trou ment).
  function courbeAudience(rows, J, fin, col){
    var out = [];
    for(var k = 0; k < 8; k++){
      var w = C.jourMoins(fin, 7 * k);
      if(w >= C.lundiDe(J)) continue;
      var a = audience(rows, joursEntre(w, C.jourMoins(w, -6)), col);
      if(a.cause || !a.lus) break;
      out.unshift(a.somme / a.lus);
    }
    return out;
  }

  // ── Mesure : cases par semaine, clé et plateforme ────────────────────────
  // À n'appeler qu'APRÈS un `agregerMesure` réussi (lignes déjà validées).
  // Mêmes filtres : `rejet` à part, nos tests écartés si l'interrupteur est
  // éteint, clés inconnues exclues.
  function casesMesure(rows, avecTest){
    var o = {};
    for(var i = 0; i < rows.length; i++){
      var r = rows[i];
      if(r.cle === 'rejet' || (!avecTest && r.test) || !C.estCleMesure(r.cle)) continue;
      var s = o[r.semaine] || (o[r.semaine] = {}), c = s[r.cle] || (s[r.cle] = {});
      c[r.plateforme] = (c[r.plateforme] || 0) + C.entierOuNul(r.n);
    }
    return o;
  }
  function somme(cases, semaines, cle, plateforme){
    var t = 0;
    for(var i = 0; i < semaines.length; i++){
      var c = cases[semaines[i]] && cases[semaines[i]][cle];
      if(!c) continue;
      for(var p in c) if(c.hasOwnProperty(p) && (!plateforme || p === plateforme)) t += c[p];
    }
    return t;
  }
  // Quelles semaines de la période sont lisibles dans la mesure ?
  // hors : une semaine sort des 182 jours conservés ; avant : sans remontée et
  // antérieure à la mise en service ; absente : semaine mesurable sans aucune
  // remontée (une semaine absente n'est pas une semaine à zéro).
  // Première semaine mesurée : la plus ancienne semaine présente dans la vue
  // (hors `rejet`, toutes lignes) ; à défaut, la mise en service (21/09).
  function premiereSemaine(rows){
    var p = null;
    for(var i = 0; i < (rows || []).length; i++){
      var r = rows[i];
      if(r && r.cle !== 'rejet' && typeof r.semaine === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.semaine) && (p === null || r.semaine < p)) p = r.semaine;
    }
    return p || MESURE_DEBUT;
  }
  // Semaines ayant au moins une ligne de PRODUCTION (test = false, clé connue,
  // hors `rejet`) — l'ancienne console écarte nos tests par défaut, et une
  // semaine qui n'a que nos tests est une semaine SANS remontée réelle.
  function semainesProduction(rows){
    var o = {}, p = null;
    for(var i = 0; i < (Array.isArray(rows) ? rows.length : 0); i++){
      var r = rows[i];
      if(!r || r.test !== false || r.cle === 'rejet' || !C.estCleMesure(r.cle) || typeof r.semaine !== 'string') continue;
      o[r.semaine] = true;
      if(p === null || r.semaine < p) p = r.semaine;
    }
    return { semaines:o, premiere: p || MESURE_DEBUT };
  }
  // Trou : une semaine sans production entre la première semaine mesurée (au plus
  // tard le 21/09) et la dernière semaine close. Le départ ne remonte jamais avant
  // la fenêtre de 182 jours de la vue : quand le 21/09 en sortira (mars 2027), le
  // contrôle partira de la plus ancienne semaine conservée (voir le rapport).
  function trouProduction(semaines, premiere, J){
    var derniere = C.jourMoins(C.lundiDe(J), 7), debut = premiere < MESURE_DEBUT ? premiere : MESURE_DEBUT, w;
    var garde = C.lundiDe(C.jourMoins(J, GARDE.mesure - 1));
    if(garde <= C.jourMoins(J, GARDE.mesure)) garde = C.jourMoins(garde, -7);
    if(debut < garde) debut = garde;
    var trou = false;
    for(w = debut; w <= derniere; w = C.jourMoins(w, -7)) if(!semaines[w]) trou = true;
    return { trou:trou, derniereVide: !semaines[derniere], derniere:derniere };
  }
  // Premiers pas de PRODUCTION (`jalon_accueil`, test = false) d'une semaine.
  function premiersPasProduction(rows, semaine){
    var t = 0;
    for(var i = 0; i < (Array.isArray(rows) ? rows.length : 0); i++){
      var r = rows[i], n = r ? C.entierOuNul(r.n) : null;
      if(r && r.semaine === semaine && r.cle === 'jalon_accueil' && r.test === false && n !== null && n > 0) t += n;
    }
    return t;
  }
  function semainesMesure(presentes, J, p, premiere, garde){
    var o = { hors:false, avant:0, absente:null, lues:[] };
    for(var i = 0; i < p.semaines.length; i++){
      var s = p.semaines[i];
      if(s <= C.jourMoins(J, garde || GARDE.mesure)){ o.hors = true; continue; }
      if(!presentes[s]){
        if(s < (premiere || MESURE_DEBUT)) o.avant++;   // avant la première semaine mesurée : pas « absente »
        else if(o.absente === null) o.absente = s;
        continue;
      }
      o.lues.push(s);
    }
    return o;
  }

  // ── v_admin_mesure_charge (toutes les clés, colonne `charge`) ────────────
  // Mêmes contrôles que `agregerMesure` : une ligne illisible et la vue
  // ENTIÈRE est refusée ; `rejet` compté avant l'interrupteur ; clés inconnues
  // signalées, jamais comptées. Plafond de 1 000 lignes sans lecture complète.
  function agregerCharge(rows, avecTest){
    if(rows && rows.erreur) return { cause:'la vue n’a pas répondu (' + rows.erreur + ')' };
    if(!Array.isArray(rows)) return { cause:'la vue n’a rien rendu' };
    if(rows.length >= C.MESURE_PLAFOND && rows.lectureComplete !== true)
      return { cause:'la vue a rendu ' + rows.length + ' lignes : la liste est probablement coupée' };
    var par = {}, inconnues = {}, ecartees = 0, rejet = 0;
    for(var i = 0; i < rows.length; i++){
      var r = rows[i];
      if(!r || typeof r.semaine !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.semaine)) return { cause:'semaine illisible' };
      if(typeof r.cle !== 'string' || !r.cle) return { cause:'clé illisible, semaine du ' + C.jourTexte(r.semaine) };
      if(typeof r.plateforme !== 'string' || !C.aPropriete(C.MESURE_PLATEFORMES, r.plateforme))
        return { cause:'plateforme inconnue « ' + String(r.plateforme) + ' »' };
      if(typeof r.version !== 'string' || !/^\d{2}\.\d{2}$/.test(r.version)) return { cause:'version illisible' };
      if(r.anciennete !== 'r' && r.anciennete !== 'a') return { cause:'ancienneté illisible' };
      if(typeof r.test !== 'boolean') return { cause:'colonne « test » illisible' };
      var ch = C.entierOuNul(r.charge);
      if(ch === null || ch < 0 || ch > 3) return { cause:'colonne « charge » illisible, semaine du ' + C.jourTexte(r.semaine) };
      var n = C.entierOuNul(r.n);
      if(n === null || n <= 0) return { cause:'compteur illisible pour « ' + r.cle + ' »' };
      if(CLES_TABLE.indexOf(r.cle) < 0){ inconnues[r.cle] = (inconnues[r.cle] || 0) + n; continue; }
      if(r.cle === 'rejet'){ rejet += n; continue; }
      if(!avecTest && r.test){ ecartees += n; continue; }
      var s = par[r.semaine] || (par[r.semaine] = {}), c = s[ch] || (s[ch] = {});
      c[r.cle] = (c[r.cle] || 0) + n;
    }
    return { parSemaine:par, clesInconnues:Object.keys(inconnues).sort(), ecartees:ecartees, rejetTotal:rejet };
  }
  function sommeCharge(a, semaines, charge, cle){
    var t = 0;
    for(var i = 0; i < semaines.length; i++){
      var s = a.parSemaine[semaines[i]], c = s && s[charge];
      if(c && c[cle]) t += c[cle];
    }
    return t;
  }

  // ── Rétention : ce que la console détaillée affiche, ou quand elle le pourra ──
  // Le calcul est `retentionMesure` (copie). Ici : le motif d'un refus et la
  // DATE (lundi) à laquelle la fenêtre de 4 semaines sera entièrement mesurée.
  function etatRetention(a, J, premiere){
    var debut = premiere || MESURE_DEBUT;
    var ret = C.retentionMesure(a), out = [];
    var jalons = ['jalon_revenu_j1', 'jalon_revenu_j2_7'];
    for(var k = 0; k < jalons.length; k++){
      var dec = C.MESURE_DECALAGE[jalons[k]];
      var date = C.jourMoins(debut, -7 * (4 + dec));   // lundi où la fenêtre est close
      var o = { jalon:jalons[k], ok:false, date:null, raison:null };
      var L = ret.lignes ? ret.lignes[k] : null;
      if(!L || (L.manque && L.manque < debut)){
        if(date > J){ o.raison = 'date'; o.date = date; }
        else o.raison = 'recul';
      } else if(L.manque){ o.raison = 'absente'; o.semaine = L.manque; }
      else if(L.num > L.den){ o.raison = 'plus'; }
      else if(L.den < C.MESURE_PLANCHER){ o.raison = 'peu'; o.den = L.den; }
      else {
        var f = C.fourchetteMesure(L.num, L.den);
        o.ok = true; o.pct = C.pctMesure(L.num, L.den); o.num = L.num; o.den = L.den;
        o.fourchette = f ? 'de ' + C.unDecimal(f.bas) + ' % à ' + C.unDecimal(f.haut) + ' %' : '';
      }
      if(L){ o.num = L.num; o.den = L.den; o.manque = L.manque; }
      out.push(o);
    }
    return { fin: ret.fin || null, cause: ret.cause || null, lignes:out };
  }

  // ── Comparaison avec la période précédente (flèche neutre) ───────────────
  // Pourcentage ENTIER pour l'écran (la décimale reste dans les bulles).
  function pctEntier(n, sur){ return sur > 0 ? Math.round(100 * n / sur) + ' %' : '—'; }
  var PLANCHER = 10;
  // Sous 10 des deux côtés : pas de flèche (« petit nombre »).
  function variation(a, b){
    if(a < PLANCHER && b < PLANCHER) return { petit:true };   // les DEUX petits : une chute 51 → 0 se voit
    if(b === 0) return a === 0 ? { f:'=', t:'pareil' } : { f:'▲', t:'contre 0' };
    var r = a / b;
    if(r >= 2) return { f:'▲', t:'×' + C.unDecimal(r) };
    var pc = Math.round(100 * (a - b) / b);
    if(pc === 0) return { f:'=', t:'pareil' };
    return { f: pc > 0 ? '▲' : '▼', t:(pc > 0 ? '+' : '−') + Math.abs(pc) + ' %' };
  }

  // ── Scan vu par le serveur (v_admin_scan, 14 jours, essais compris) ──────
  function scanServeur(rows, J, p){
    var lu = C.lignesScan(rows);
    if(lu.cause) return { cause:lu.cause };
    if(p.debut < C.jourMoins(J, GARDE.scan - 1)) return { hors:true };
    var s = 0, e = 0;
    for(var i = 0; i < lu.lignes.length; i++){
      var r = lu.lignes[i];
      if(r.jour >= p.debut && r.jour <= p.dernierJour){ s += r.servis_probables; e += r.envoyes; }
    }
    return { servis:s, envoyes:e };
  }

  racine.TDPeriode = {
    MESURE_DEBUT:MESURE_DEBUT, V3_PREMIERE:V3_PREMIERE, GARDE:GARDE, CLES_TABLE:CLES_TABLE,
    joursEntre:joursEntre, jj_mm:jj_mm, periode:periode, precedente:precedente,
    finParDefaut:finParDefaut, bornes:bornes, semainesProduction:semainesProduction, trouProduction:trouProduction, premiersPasProduction:premiersPasProduction, premiereSemaineVisible:premiereSemaineVisible, libelle:libelle, premiereSemaine:premiereSemaine,
    pctEntier:pctEntier, PLANCHER:PLANCHER,
    audience:audience, courbeAudience:courbeAudience, casesMesure:casesMesure, somme:somme,
    semainesMesure:semainesMesure, agregerCharge:agregerCharge, sommeCharge:sommeCharge,
    etatRetention:etatRetention, variation:variation, scanServeur:scanServeur
  };
})(typeof window !== 'undefined' ? window : this);
