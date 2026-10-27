/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.6) — « LE PARCOURS » : CALCULS
 * ============================================================================
 * Fonctions PURES (aucune requête, aucun DOM) pour td-essentiel.js.
 * Sources nouvelles, lues après le premier affichage (td-donnees.js, `suite`) :
 *  - `v_admin_mesure_v4` et `v_admin_mesure_v5` : les compteurs des versions
 *    1.4.32-1.4.33 (charge 4) et 1.4.34 et plus (charge 5), une ligne par
 *    semaine × clé × plateforme × version × ancienneté × tests. Pas de double
 *    compte entre les deux : chaque envoi porte une seule charge. Pour une clé
 *    qui existait AVANT la 1.4.32 (jalons…), la page garde `v_admin_mesure`
 *    (toutes versions) : ces deux vues ne servent qu'aux clés nouvelles ;
 *  - `v_admin_essais` : blocs de semaines (premier essai, 1.4.34 et plus).
 * RÈGLES : « un entier ou rien » (une valeur illisible rend tout le calcul
 * illisible, jamais 0) ; « Nos tests » suit l'interrupteur de la page ;
 * aucun pourcentage sur la semaine en cours, sous 20 au dénominateur, ou
 * quand le haut dépasse le bas.
 * ES5 strict. Expose `TDEssentielCalc`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc;
  var PLANCHER_PCT = 20;

  // Chemin d'activation des rappels (1.4.36, positions 58 à 70, `compteursV5.ts`).
  var RF5 = ['rappels_explication_vue', 'rappels_explication_activer', 'rappels_explication_plus_tard',
    'rappels_accordes', 'rappels_non_accordes', 'rappels_sans_explication_accordes',
    'rappels_sans_explication_non_accordes', 'rappels_bandeau_activer', 'rappels_bloques_reglages',
    'rappels_retablis', 'alarmes_explication_vue', 'alarmes_autoriser', 'alarmes_accordees'];
  var CONDITIONS = ['conditions_feuille_affichee', 'conditions_acceptees', 'conditions_pas_maintenant'];
  var PILOUPLUS = ['paywall_limite', 'paywall_fonction', 'paywall_historique', 'paywall_decouvrir',
    'achat_lance', 'achat_annule', 'achat_autre', 'abonnement_depuis_offre'];

  function aProp(o, k){ return Object.prototype.hasOwnProperty.call(o, k); }

  // Sommes, sur les semaines demandées, des clés v4 + v5.
  // `lots` : [lignes v4, lignes v5] (chacune : tableau, { erreur } ou absente).
  // Rend { par:{ cle:n }, vues:[nb de lignes retenues par lot] } ou { cause }. Un lot sans
  // aucune ligne retenue = pas encore mesuré (jamais « 0 », revue du code M1).
  function sommesCles(lots, semaines, avecTest){
    var veut = {}, par = {}, vues = [], i, k;
    for(i = 0; i < semaines.length; i++) veut[semaines[i]] = true;
    for(k = 0; k < lots.length; k++){
      var rows = lots[k];
      vues[k] = 0;
      if(rows === undefined || rows === null) return { cause:'les chiffres des versions récentes n’ont pas été lus' };
      if(!Array.isArray(rows)) return { cause:'une vue des versions récentes n’a pas répondu (' + (rows.erreur || 'réponse illisible') + ')' };
      for(i = 0; i < rows.length; i++){
        var r = rows[i];
        if(!r || typeof r !== 'object' || !C.jourValide(r.semaine) || typeof r.cle !== 'string' || typeof r.test !== 'boolean')
          return { cause:'une ligne illisible' };
        // « Un entier ou rien » sur TOUTE la vue (même règle qu'`agregerCharge`) :
        // une ligne fausse, même d'une autre semaine, rend le calcul illisible.
        var n = C.entierOuNul(r.n);
        if(n === null || n < 0) return { cause:'un nombre illisible la semaine du ' + r.semaine.slice(8, 10) + '/' + r.semaine.slice(5, 7) };
        if(!veut[r.semaine]) continue;
        if(r.test && !avecTest) continue;
        par[r.cle] = (par[r.cle] || 0) + n;
        vues[k]++;
      }
    }
    return { par:par, vues:vues };
  }
  function val(s, cle){ return aProp(s.par, cle) ? s.par[cle] : 0; }

  // Colonne de l'historique (`v_admin_entonnoir_semaine`, lu par td-pilotage.js)
  // sommée sur des semaines : { v (null : rien), ko, hors }.
  function colonne(e, semaines, col){
    var o = { v:null, ko:false, hors:false };
    for(var i = 0; i < semaines.length; i++){
      var l = e.par[semaines[i]];
      if(!l){ o.hors = true; continue; }
      if(!aProp(l, col)){ o.ko = true; continue; }
      if(l[col] === null) continue;
      var v = C.entierOuNul(l[col]);
      if(v === null || v < 0){ o.ko = true; continue; }
      o.v = (o.v || 0) + v;
    }
    return o;
  }

  // Pourcentage entier, ou null quand il ne faut pas en donner.
  function pct(n, sur, enCours){
    if(enCours || n === null || sur === null || sur < PLANCHER_PCT || n > sur) return null;
    return Math.round(100 * n / sur);
  }

  // Blocs de premier essai qui touchent la période (fin du bloc = lundi de sa
  // dernière semaine : le bloc court jusqu'au dimanche, fin + 6 jours).
  // Rend { blocs:[{ debut, dimanche, n, scan, saisie }] } ou { cause }.
  function essais(rows, debut, dimanche){
    if(rows === undefined || rows === null) return { cause:'les premiers essais n’ont pas été lus' };
    if(!Array.isArray(rows)) return { cause:'la vue des premiers essais n’a pas répondu (' + (rows.erreur || 'réponse illisible') + ')' };
    var out = [];
    for(var i = 0; i < rows.length; i++){
      var b = rows[i];
      if(!b || !C.jourValide(b.debut) || !C.jourValide(b.fin) || b.fin < b.debut) return { cause:'un bloc illisible' };
      var dim = C.jourMoins(b.fin, -6);
      if(b.debut > dimanche || dim < debut) continue;
      var n = C.entierOuNul(b.premiers_essais), sc = C.entierOuNul(b.par_scan), sa = C.entierOuNul(b.par_saisie);
      if(n === null || sc === null || sa === null || n < 0 || sc < 0 || sa < 0) return { cause:'un nombre illisible' };
      out.push({ debut:b.debut, dimanche:dim, n:n, scan:sc, saisie:sa });
    }
    out.sort(function(a, z){ return a.debut < z.debut ? -1 : (a.debut > z.debut ? 1 : 0); });
    return { blocs:out };
  }

  racine.TDEssentielCalc = { RF5:RF5, CONDITIONS:CONDITIONS, PILOUPLUS:PILOUPLUS, PLANCHER_PCT:PLANCHER_PCT,
    sommesCles:sommesCles, val:val, colonne:colonne, pct:pct, essais:essais };
})(typeof window !== 'undefined' ? window : this);
