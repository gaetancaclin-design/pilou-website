/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4.4) — « UTILISENT PILOU CETTE SEMAINE »
 * ============================================================================
 * Demande de Gaétan (26/10/2026) : voir tout en haut combien de téléphones se
 * servent vraiment de Pilou, et surtout combien depuis plus de 30 jours.
 * Source : `v_admin_entonnoir_semaine` (déjà lue par td-donnees.js, clé
 * `pilotage`), colonnes de PRÉSENCE (version 1.4.32 et suivantes) :
 *   - `installations_presentes` : téléphones où Pilou a été ouvert au moins une
 *     fois dans la semaine, après acceptation des conditions, chacun une fois ;
 *   - `presentes_moins_7j|7_30j|31_90j|plus_90j|anciennete_inconnue` : la même
 *     chose par ancienneté depuis l'acceptation ;
 *   - `jours_ouverture_moins_7j` + `_7j_et_plus` + `_anciennete_inconnue` :
 *     jours d'utilisation (un par téléphone et par jour où un message est
 *     arrivé) — les TROIS colonnes, comme la carte « Actifs par jour »
 *     (td-cartes.js:193) : un seul chiffre sur la page (revue du 26/10, M2).
 * « Plus de 30 jours » = 31-90 + plus de 90 ; la tranche « inconnue » (date
 * d'acceptation non gardée avant le commit 31cd7fc du 22/09, rares horloges
 * déréglées) est ajoutée à part dans la même case (revue du 26/10, M3).
 * La vue exclut toujours nos tests (`test = false`) : l'interrupteur « Nos
 * tests » ne change rien ici, et c'est écrit.
 * RÈGLES (celles de td-pilotage.js) : null → « — » gris, jamais 0 ; valeur
 * illisible ou colonne absente → « — » rouge, signalée ; aucune flèche ni
 * aucun pourcentage sur la semaine en cours ; aucune requête, aucun stockage.
 * `rendre` ne lève JAMAIS. ES5 strict. Expose `TDUtilisent`.
 * ========================================================================== */
(function(racine){
  'use strict';
  var C = racine.TDCalc, P = racine.TDPeriode, B = racine.TDBulles;
  function ech(s){ return C.ech(s); }

  var TRANCHES = ['presentes_moins_7j', 'presentes_7_30j', 'presentes_31_90j', 'presentes_plus_90j', 'presentes_anciennete_inconnue'];

  // { v } (null = rien reçu) ou { ko:true } (absente ou illisible).
  function lire(l, nom){
    if(!l || !Object.prototype.hasOwnProperty.call(l, nom)) return { ko:true };
    if(l[nom] === null) return { v:null };
    var v = C.entierOuNul(l[nom]);
    return (v === null || v < 0) ? { ko:true } : { v:v };
  }
  // Somme de valeurs lues : ko si l'une est illisible ; null si toutes sont nulles.
  function addition(vals){
    var o = { v:null };
    for(var i = 0; i < vals.length; i++){
      if(vals[i].ko) return { ko:true };
      if(vals[i].v !== null) o.v = (o.v || 0) + vals[i].v;
    }
    return o;
  }
  // Petit nombre dans une ligne : même règle (rouge si illisible, gris si rien).
  function petit(r){
    if(r.ko) return '<span class="ut-ko">—</span>';
    if(r.v === null) return '<span class="ut-vide">—</span>';
    return String(r.v);
  }
  function nombre(r, cl){
    if(r.ko) return '<b class="' + (cl || '') + ' ut-ko">—</b>';
    if(r.v === null) return '<b class="' + (cl || '') + ' ut-vide">—</b>';
    return '<b class="' + (cl || '') + '">' + r.v + '</b>';
  }
  function message(cl, titre, texte){
    return '<div class="ut-tete"><div class="ut-titre">Utilisent Pilou</div></div><div class="message' + (cl ? ' ' + cl : '') + '"><b>'
      + ech(titre) + '</b> ' + ech(texte) + '</div>';
  }

  var AIDE_TOTAL = [
    'Téléphones sur lesquels Pilou a été ouvert au moins une fois dans la semaine, après acceptation des conditions. Chacun est compté en principe une seule fois par semaine, quel que soit le nombre d’ouvertures (rare exception : un envoi fait le lundi entre minuit et 1 ou 2 h, heure de Paris).',
    'C’est un minimum : ne sont pas comptés les téléphones qui ont refusé « Contribuer à améliorer Pilou », ceux restés sans réseau, et une ouverture trop brève pour que Pilou envoie ses chiffres.',
    'Seuls les téléphones en version 1.4.32 ou suivante le disent : ceux restés sur une version plus ancienne ne sont pas comptés ici. Premières semaines mesurées : à partir du 12/10.',
    'Semaine en cours : le chiffre monte au fil des ouvertures ; aucune comparaison tant qu’elle n’est pas terminée.',
    'Nos tests sont toujours exclus de ce bloc (l’interrupteur « Nos tests » ne le change pas).'
  ];
  var AIDE_30 = [
    'Grand chiffre : téléphones dont les conditions ont été acceptées il y a plus de 30 jours (de 31 à 90 jours, et plus de 90 jours).',
    '« Ancienneté inconnue », ajoutée à part : téléphones dont Pilou ne connaît pas la date d’acceptation, parce qu’ils ont accepté avec une version de Pilou qui ne la gardait pas encore (versions de fin septembre et d’avant), ou, rarement, parce que l’horloge du téléphone est déréglée. Ce sont donc pour l’essentiel les plus anciens utilisateurs ; leur ancienneté exacte restera inconnue.',
    'Les premiers téléphones à plus de 30 jours d’ancienneté connue apparaissent la semaine du 26/10.'
  ];
  var AIDE_JOURS = [
    'Jours d’utilisation : un par téléphone et par jour où Pilou a envoyé ses chiffres (versions 1.4.22 et suivantes, donc plus large que le total ci-dessus ; comprend aussi des ouvertures faites avant l’acceptation des conditions). Même chiffre que la ligne « Actifs par jour » plus bas, en vue « Semaine ».',
    'Une ouverture sans aucun geste dans l’appli peut ne rien envoyer : le chiffre est un peu en dessous de la réalité, rarement au-dessus (un envoi peut exceptionnellement compter deux fois).',
    'Moyenne par jour : jours d’utilisation de la semaine divisés par 7, seulement pour une semaine terminée.'
  ];

  function corps(l, prec, p){
    var tot = lire(l, 'installations_presentes'), t = {}, i;
    for(i = 0; i < TRANCHES.length; i++) t[TRANCHES[i]] = lire(l, TRANCHES[i]);
    var plus30 = addition([t.presentes_31_90j, t.presentes_plus_90j]);
    var somme = addition([t.presentes_moins_7j, t.presentes_7_30j, t.presentes_31_90j, t.presentes_plus_90j, t.presentes_anciennete_inconnue]);
    var jours = addition([lire(l, 'jours_ouverture_moins_7j'), lire(l, 'jours_ouverture_7j_et_plus'), lire(l, 'jours_ouverture_anciennete_inconnue')]);
    var illisibles = tot.ko || plus30.ko || somme.ko || jours.ko;
    for(i = 0; i < TRANCHES.length; i++) if(t[TRANCHES[i]].ko) illisibles = true;
    var notes = [];
    // Contrôle : les tranches doivent refaire le total (une case par téléphone et par semaine).
    if(!tot.ko && !somme.ko && tot.v !== null && (somme.v || 0) !== tot.v)
      notes.push('<span class="message ko">Les tranches (' + (somme.v || 0) + ') ne refont pas le total (' + tot.v + ') : n’en concluez rien, à signaler tel quel.</span>');
    if(illisibles) notes.push('<span class="message ko">Un chiffre illisible, en rouge : n’en concluez rien.</span>');
    if(!tot.ko && tot.v === null) notes.push('<span class="mini">Rien de reçu pour cette semaine : pas encore mesuré (avant la 1.4.32), ou zéro. N’en concluez rien.</span>');

    var h = '<div class="ut-tete"><div><div class="ut-titre">Utilisent Pilou ' + (p.enCours ? 'cette semaine' : 'la semaine du ' + ech(P.jj_mm(p.fin)))
      + B.aide('Utilisent Pilou', 'utTotal', AIDE_TOTAL) + '</div><div class="ut-sous">Pilou ouvert au moins une fois dans la semaine · chacun compté une fois en principe · nos tests exclus'
      + (p.enCours ? ' · semaine en cours, le chiffre monte au fil des ouvertures' : '')
      + (p.mode === '4sem' ? ' · dernière semaine de la période' : '') + '</div></div>'
      + '<div class="ut-total">' + nombre(tot) + '<span>téléphones</span>';
    if(prec){
      var tp = lire(prec, 'installations_presentes');
      if(tp.ko || tp.v !== null) h += '<small>' + (p.enCours ? 'semaine dernière (complète) : ' : 'semaine d’avant : ') + petit(tp) + '</small>';
    }
    h += '</div></div><div class="ut-tranches">'
      + '<div class="ut-tr">' + nombre(t.presentes_moins_7j) + '<span>arrivés il y a moins de 7 jours</span></div>'
      + '<div class="ut-tr">' + nombre(t.presentes_7_30j) + '<span>7 à 30 jours</span></div>'
      + '<div class="ut-tr ut-fort">' + nombre(plus30) + '<span>plus de 30 jours' + B.aide('Plus de 30 jours', 'ut30', AIDE_30) + '</span>'
      + '<small>31 à 90 j : ' + petit(t.presentes_31_90j) + ' · plus de 90 j : ' + petit(t.presentes_plus_90j) + '</small>'
      + (t.presentes_anciennete_inconnue.ko || t.presentes_anciennete_inconnue.v !== null
        ? '<small class="ut-inconnue">+ ' + petit(t.presentes_anciennete_inconnue) + ' d’ancienneté inconnue, pour l’essentiel arrivés avant fin septembre</small>' : '')
      + '</div>'
      + '</div>';
    var lj = '';
    if(jours.ko) lj = 'Jours d’utilisation : <b class="ut-ko">—</b>';
    else if(jours.v !== null){
      lj = 'Jours d’utilisation ' + (p.enCours ? 'depuis lundi' : 'de la semaine') + ' : <b>' + jours.v + '</b>';
      if(!p.enCours) lj += ' · soit en moyenne <b>' + C.unDecimal(jours.v / 7) + '</b> téléphones par jour';
    }
    if(lj) h += '<div class="ut-jours">' + lj + B.aide('Jours d’utilisation', 'utJours', AIDE_JOURS) + '</div>';
    if(notes.length) h += '<div class="ut-notes">' + notes.join('') + '</div>';
    return h;
  }

  // donnees : d.pilotage (tableau de lignes, ou { erreur }, ou absent) ; p : période affichée.
  function rendre(donnees, p){
    try {
      if(!racine.TDPilotage) return message('ko', 'Non affiché.', 'Le fichier td-pilotage.js n’a pas été chargé.');
      var e = racine.TDPilotage.semaines(donnees);
      if(e.cause) return message('ko', 'Non lu.', 'Ce bloc vient de l’historique semaine par semaine : ' + e.cause + '. N’en concluez rien.');
      var l = e.par[p.fin];
      if(!l) return message('', 'Aucune ligne pour la semaine du ' + P.jj_mm(p.fin) + '.', 'La vue ne couvre pas cette semaine. N’en concluez rien.');
      return corps(l, e.par[C.jourMoins(p.fin, 7)] || null, p);
    } catch(err){
      if(racine.console) racine.console.error('utilisent :', err);
      return message('ko', 'Non affiché.', 'Cette page n’a pas su afficher ces chiffres (' + (err && err.message ? err.message : err)
        + '). C’est un défaut de la page, pas de la base ; le reste du tableau de bord n’est pas concerné.');
    }
  }

  racine.TDUtilisent = { rendre:rendre, TRANCHES:TRANCHES };
})(window);
