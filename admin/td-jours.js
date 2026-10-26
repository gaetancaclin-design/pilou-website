/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.5) — « CHAQUE JOUR »
 * ============================================================================
 * Demande de Gaétan (26/10/2026) : savoir chaque jour combien de téléphones se
 * servent de Pilou, et si ça monte. Source : `v_admin_jours` (totaux par jour,
 * heure de Paris, relevés toutes les 5 minutes depuis le 26/10 à 22 h 51 ;
 * sans plateforme, sans version, sans nos tests) et `v_admin_jours_releves`
 * (nombre de relevés par jour, plus long trou entre deux). Politique publiée
 * le 26/10 (site 0eb89cc). Les deux vues sont FACULTATIVES : leur échec
 * n'éteint que ce bloc.
 * Lignes : `envoi_recu` par groupe — r (moins de 7 j), m (7 à 30 j), tl (plus
 * de 30 j), a (7 j et plus ou inconnue, versions 1.4.22 à 1.4.31), i (inconnue,
 * dont ouvertures avant acceptation) ; jalons `jalon_accueil`,
 * `jalon_revenu_j1` (groupe « - »).
 * RÈGLES :
 *  - un jour TERMINÉ est « complet » s'il a au moins 280 relevés (288 prévus)
 *    et aucun trou de plus de 15 minutes ; sinon « incomplet », jamais comparé ;
 *  - le jour en cours : nombres seuls, sans comparaison ;
 *  - comparaison (hier contre le même jour la semaine d'avant) seulement entre
 *    deux jours complets, en écart absolu (petits nombres : pas de %) ;
 *  - null → « — » gris ; valeur illisible → « — » rouge, signalée ;
 *  - l'heure du poste ne sert qu'à dire depuis combien de temps date le
 *    dernier relevé (comme « Relevé le … ») ; le jour de référence vient de la
 *    base (dernier relevé, heure de Paris).
 * `rendre` ne lève JAMAIS. ES5 strict. Expose `TDJours`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, B = racine.TDBulles;
  function ech(s){ return C.ech(s); }

  var GROUPES = ['r', 'm', 'tl', 'a', 'i'];
  var CLES = ['envoi_recu', 'jalon_accueil', 'jalon_revenu_j1', 'jalon_revenu_j2_7', 'jalon_revenu_j8_30'];
  var RELEVES_MIN = 280, TROU_MAX_S = 900, ARRET_MIN = 15, JOURS_COURBE = 30;
  var fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', hour:'2-digit', minute:'2-digit' });
  var fmtJour = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' });
  function jourParis(d){ var p = fmtJour.formatToParts(d), o = {}; for(var i = 0; i < p.length; i++) o[p[i].type] = p[i].value; return o.year + '-' + o.month + '-' + o.day; }
  function jjmm(j){ return j.slice(8, 10) + '/' + j.slice(5, 7); }
  var JOURS_SEM = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function nomJour(j){ return JOURS_SEM[new Date(Date.parse(j + 'T12:00:00Z')).getUTCDay()]; }

  // ── Lecture des lignes : { par:{ jour:{ total, g:{r..}, accueil, j1, ko } }, ko, rejet } ──
  function preparer(lignes){
    var par = {}, rejet = 0;
    for(var i = 0; i < lignes.length; i++){
      var l = lignes[i];
      if(!l || !C.jourValide(l.jour) || CLES.indexOf(l.cle) < 0){ rejet++; continue; }
      var n = C.entierOuNul(l.n);
      var e = par[l.jour] || (par[l.jour] = { g:{}, total:null, accueil:null, j1:null, ko:false });
      if(n === null || n < 0){ e.ko = true; continue; }
      if(l.cle === 'envoi_recu'){
        if(GROUPES.indexOf(l.groupe) < 0){ rejet++; e.ko = true; continue; }
        e.g[l.groupe] = (e.g[l.groupe] || 0) + n;
        e.total = (e.total || 0) + n;
      } else if(l.cle === 'jalon_accueil') e.accueil = (e.accueil || 0) + n;
      else if(l.cle === 'jalon_revenu_j1') e.j1 = (e.j1 || 0) + n;
    }
    return { par:par, rejet:rejet };
  }
  // Relevés : { jour: { nb, premier, dernier, trou, ko } }
  function releves(lignes){
    var par = {}, dernier = null;
    for(var i = 0; i < lignes.length; i++){
      var l = lignes[i];
      if(!l || !C.jourValide(l.jour)) continue;
      var nb = C.entierOuNul(l.nb), trou = C.entierOuNul(l.plus_long_trou_s), t = Date.parse(l.dernier), t0 = Date.parse(l.premier);
      var ok = nb !== null && nb >= 0 && trou !== null && trou >= 0 && isFinite(t) && isFinite(t0);
      par[l.jour] = { nb:nb, trou:trou, dernier:ok ? t : null, premier:ok ? t0 : null, ko:!ok };
      if(ok && (dernier === null || t > dernier)) dernier = t;
    }
    return { par:par, dernier:dernier };
  }
  // Relevés attendus un jour donné (288 ; 276 au passage à l'heure d'été, dernier
  // dimanche de mars ; 300 au retour à l'heure d'hiver, dernier dimanche d'octobre).
  function attendus(jour){
    var d = new Date(Date.parse(jour + 'T12:00:00Z')), m = d.getUTCMonth() + 1, dim = d.getUTCDay() === 0 && d.getUTCDate() >= 25;
    return dim && m === 3 ? 276 : (dim && m === 10 ? 300 : 288);
  }
  // Un jour terminé est complet : assez de relevés, aucun long trou, suivi depuis minuit
  // (premier relevé dans les 6 premières minutes) et jusqu'à minuit (dernier dans les 6 dernières).
  function complet(rv, jour){
    var r = rv.par[jour];
    if(!r || r.ko) return false;
    if(r.nb < attendus(jour) - 8 || r.trou > TROU_MAX_S) return false;
    return jourParis(new Date(r.premier - 6 * 60000)) < jour && jourParis(new Date(r.dernier + 6 * 60000)) > jour;
  }
  // Un jour qui a des relevés et aucune ligne pour un groupe : c'est un vrai 0 (le relevé
  // n'écrit rien quand il n'y a rien à ajouter). Sans relevé : rien (null).
  function entree(pj, rv, jour){
    var e = pj.par[jour], r = rv.par[jour];
    if(!r || r.ko) return e || null;
    e = e || { g:{}, total:null, accueil:null, j1:null, ko:false };
    if(e.ko) return e;                                    // jour illisible : rien n'est complété
    for(var i = 0; i < GROUPES.length; i++) if(e.g[GROUPES[i]] === undefined) e.g[GROUPES[i]] = 0;
    if(e.total === null) e.total = 0;
    if(e.accueil === null) e.accueil = 0;
    if(e.j1 === null) e.j1 = 0;
    return e;
  }

  function nb(v, ko){
    if(ko) return '<b class="ut-ko">—</b>';
    if(v === null || v === undefined) return '<b class="ut-vide">—</b>';
    return '<b>' + v + '</b>';
  }
  function pt(v){ return (v === null || v === undefined) ? '<span class="ut-vide">—</span>' : String(v); }

  var AIDE = [
    'Messages de statistiques reçus ce jour-là : un par téléphone et par jour, en principe, à l’heure de Paris, à 5 minutes près. Versions 1.4.22 et suivantes seulement ; ils comprennent des ouvertures faites avant l’acceptation des conditions (groupe « inconnue »), contrairement au bloc « Utilisent Pilou » au-dessus. Sans nos tests.',
    'C’est un minimum : une ouverture sans aucun geste, sans réseau, ou sur un téléphone qui a refusé « Contribuer à améliorer Pilou » peut ne rien envoyer.',
    '« Anciennes versions » : versions 1.4.22 à 1.4.31, qui ne disent pas l’ancienneté exacte. « Inconnue » : ancienneté inconnue, dont des ouvertures faites avant l’acceptation des conditions.',
    'Nouveaux : premières acceptations des conditions reçues ce jour-là. Revenus le lendemain : retours le jour qui suit l’acceptation.',
    'Comptage jour par jour depuis le 26/10 à 22 h 51. Un jour est « incomplet » s’il manque des relevés automatiques (arrêt de plus de 15 minutes, début ou fin de journée non relevés) : il n’est alors jamais comparé.'
  ];

  function detail(e){
    var g = e.g;
    return '<div class="jr-detail">moins de 7 j ' + pt(g.r) + ' · 7 à 30 j ' + pt(g.m) + ' · plus de 30 j ' + pt(g.tl)
      + (g.a ? ' · anciennes versions ' + g.a : '') + (g.i ? ' · inconnue ' + g.i : '')
      + '<br>nouveaux ' + pt(e.accueil) + ' · revenus le lendemain ' + pt(e.j1) + '</div>';
  }

  function corps(pj, rv, maintenant){
    if(rv.dernier === null) return message('', 'Pas encore de relevé.', 'Le relevé automatique n’a pas encore tourné. N’en concluez rien.');
    var auj = jourParis(new Date(rv.dernier)), hier = C.jourMoins(auj, 1), semAv = C.jourMoins(hier, 7);
    var minutes = Math.round((maintenant - rv.dernier) / 60000), h = '';
    var eA = entree(pj, rv, auj) || { g:{}, total:null, accueil:null, j1:null }, eH = entree(pj, rv, hier);
    var estAuj = auj === jourParis(new Date(maintenant));
    h += '<div class="ut-tete"><div><div class="ut-titre">Chaque jour' + B.aide('Chaque jour', 'jrAide', AIDE) + '</div>'
      + '<div class="ut-sous">Téléphones qui ont ouvert Pilou ce jour-là (messages reçus, un par téléphone en principe) · nos tests exclus · relevé à '
      + ech(fmtHeure.format(new Date(rv.dernier))) + '</div></div></div>';
    if(minutes > ARRET_MIN) h += '<div class="message ko"><b>Relevé arrêté ?</b> Dernier relevé il y a ' + minutes + ' minutes (prévu toutes les 5 minutes). Les chiffres du jour ne bougent plus : à signaler tel quel.</div>';
    h += '<div class="jr-deux">';
    h += '<div class="ut-tr"><span>' + (estAuj ? 'aujourd’hui ' + ech(jjmm(auj)) + ' · en cours' : 'dernier jour relevé : ' + ech(jjmm(auj)))
      + '</span>' + nb(eA.total, eA.ko) + detail(eA) + '</div>';
    var compH = complet(rv, hier), compS = complet(rv, semAv), eS = entree(pj, rv, semAv);
    var cmp = '';
    if(eH && compH && eS && compS && !eH.ko && !eS.ko && eH.total !== null && eS.total !== null){
      var d = eH.total - eS.total;
      cmp = '<small>' + (d > 0 ? '+' : (d < 0 ? '−' : '±')) + Math.abs(d) + ' par rapport au ' + nomJour(semAv) + ' ' + ech(jjmm(semAv)) + ' (' + eS.total + ')</small>';
    }
    h += '<div class="ut-tr"><span>' + (estAuj ? 'hier ' : 'jour précédent ') + ech(jjmm(hier)) + (eH && !compH ? ' · <em class="jr-inc">incomplet</em>' : '') + '</span>'
      + (eH ? nb(eH.total, eH.ko) + detail(eH) : nb(null)) + cmp + '</div>';
    h += '</div>' + courbe(pj, rv, auj);
    var notes = [];
    for(var j in pj.par) if(Object.prototype.hasOwnProperty.call(pj.par, j) && pj.par[j].ko){ notes.push('<span class="message ko">Une valeur illisible (jour du ' + ech(jjmm(j)) + '), en rouge : n’en concluez rien.</span>'); break; }
    if(pj.rejet) notes.push('<span class="message ko">' + pj.rejet + ' ligne(s) illisible(s) mise(s) de côté : à signaler tel quel.</span>');
    if(notes.length) h += '<div class="ut-notes">' + notes.join('') + '</div>';
    return h;
  }

  // Barres des 30 derniers jours (aujourd'hui compris, à droite), jours incomplets hachurés.
  function courbe(pj, rv, auj){
    var jours = [], max = 0, i, premier = null, k;
    for(k in rv.par) if(Object.prototype.hasOwnProperty.call(rv.par, k) && (premier === null || k < premier)) premier = k;
    for(k in pj.par) if(Object.prototype.hasOwnProperty.call(pj.par, k) && (premier === null || k < premier)) premier = k;
    for(i = JOURS_COURBE - 1; i >= 0; i--){
      var j = C.jourMoins(auj, i), e = entree(pj, rv, j);
      if(premier === null || j < premier) continue;        // avant le début du comptage
      var v = e && !e.ko ? e.total : null;
      jours.push({ j:j, v:v, enCours:j === auj, inc:j !== auj && !complet(rv, j) });
      if(v !== null && v > max) max = v;
    }
    if(jours.length < 2) return '<div class="mini jr-pied">La courbe des 30 derniers jours se remplira jour après jour.</div>';
    var b = '';
    for(i = 0; i < jours.length; i++){
      var x = jours[i], hpx = x.v === null || max === 0 ? 2 : Math.max(2, Math.round(x.v / max * 64));
      var lib = nomJour(x.j) + ' ' + jjmm(x.j) + ' : ' + (x.v === null ? '—' : x.v) + (x.enCours ? ' (en cours)' : (x.inc ? ' (incomplet)' : ''));
      b += '<span class="jr-b' + (x.enCours ? ' jr-cours' : '') + (x.inc ? ' jr-incb' : '') + '" style="height:' + hpx + 'px" title="' + ech(lib) + '" role="img" aria-label="' + ech(lib) + '"></span>';
    }
    return '<div class="jr-courbe" role="group" aria-label="Téléphones par jour, 30 derniers jours">' + b + '</div>'
      + '<div class="mini jr-pied">30 derniers jours · hachuré : jour incomplet · bordure pointillée : aujourd’hui, en cours</div>';
  }

  function message(cl, titre, texte){
    return '<div class="ut-tete"><div class="ut-titre">Chaque jour</div></div><div class="message' + (cl ? ' ' + cl : '') + '"><b>'
      + ech(titre) + '</b> ' + ech(texte) + '</div>';
  }

  // jours : d.jours ; rel : d.joursReleves (tableaux, ou { erreur }, ou absents).
  function rendre(jours, rel, maintenant){
    try {
      if(jours === undefined || jours === null || rel === undefined || rel === null) return message('ko', 'Non lu.', 'Les totaux par jour n’ont pas été lus. N’en concluez rien.');
      if(!Array.isArray(jours) || !Array.isArray(rel)) return message('ko', 'Non lu.', 'La base a répondu : « ' + ((jours && jours.erreur) || (rel && rel.erreur) || 'réponse illisible') + ' ». N’en concluez rien.');
      return corps(preparer(jours), releves(rel), typeof maintenant === 'number' ? maintenant : Date.now());
    } catch(err){
      if(racine.console) racine.console.error('jours :', err);
      return message('ko', 'Non affiché.', 'Cette page n’a pas su afficher ces chiffres (' + (err && err.message ? err.message : err)
        + '). C’est un défaut de la page, pas de la base ; le reste du tableau de bord n’est pas concerné.');
    }
  }

  racine.TDJours = { rendre:rendre, complet:complet, attendus:attendus, preparer:preparer, releves:releves, jourParis:jourParis };
})(window);
