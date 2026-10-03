/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — CALCULS RECOPIÉS DE LA CONSOLE DÉTAILLÉE
 * ============================================================================
 * Chaque bloc ci-dessous est une COPIE À L'IDENTIQUE de admin/index.html (plages
 * de lignes indiquées), faite par banc/outils/construire-calculs.py — aucune
 * retouche à la main. Le banc (banc/verifier-copies.js) compare le texte de
 * chaque fonction à l'original : une seule lettre d'écart = défaut.
 * Rien de nouveau ici : les calculs propres au tableau de bord sont dans
 * td-periode.js. ES5 strict, aucune requête réseau. Expose `TDCalc`.
 * ========================================================================== */
(function(racine){
  'use strict';

  // ── index.html, lignes 838 à 845 (copie) ──
  var fmtDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone:'Europe/Paris', day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
  var fmtJour = new Intl.DateTimeFormat('fr-FR', {
    timeZone:'Europe/Paris', day:'2-digit', month:'2-digit', year:'2-digit'
  });

  // ── index.html, lignes 847 à 854 (copie) ──
  function jourTexte(v){
    if(!v) return "—";
    // Les colonnes `date` arrivent en "AAAA-MM-JJ" : on les lit telles quelles,
    // sans conversion de fuseau, sinon le 1er du mois recule d'un jour.
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    if(m) return m[3]+"/"+m[2]+"/"+m[1].slice(2);
    return fmtJour.format(new Date(v));
  }
  // ── index.html, lignes 859 à 868 (copie) ──
  var NOMS_MOIS = ["janvier","f\u00e9vrier","mars","avril","mai","juin",
    "juillet","ao\u00fbt","septembre","octobre","novembre","d\u00e9cembre"];
  function moisTexte(v){
    if(!v) return "\u2014";
    var m = /^(\d{4})-(\d{2})-\d{2}/.exec(String(v));
    if(!m) return jourTexte(v);
    var i = parseInt(m[2], 10) - 1;
    if(i < 0 || i > 11) return jourTexte(v);
    return NOMS_MOIS[i] + " " + m[1];
  }
  // ── index.html, lignes 879 à 884 (copie) ──
  function ech(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }
  function nb(v){ return (v == null) ? "—" : String(v); }
  // ── index.html, lignes 893 à 905 (copie) ──
  function entierOuNul(v){
    if(typeof v === 'number') return (isFinite(v) && v % 1 === 0) ? v : null;
    if(typeof v !== 'string') return null;
    // ⚠️ `Number('   ')` vaut ZERO. Une colonne remplie d'espaces passait donc
    // pour un vrai zero et la page annoncait « 0 client payant ».
    var s = v.replace(/^\s+|\s+$/g, '');
    if(s === '') return null;
    var x = Number(s);
    // ⚠️ ET UN ENTIER, PUISQUE C'EST SON NOM. Toutes les colonnes qui passent
    // ici sont des comptes. Un decimal y produirait « (4.5 octrois) », et un
    // ecart de 0,5 allumerait le bloc rouge « DEUX CHIFFRES EN DESACCORD ».
    return (isFinite(x) && x % 1 === 0) ? x : null;
  }
  // ── index.html, lignes 2832 à 2885 (copie) ──
  var SCAN_COLONNES = ['envoyes','servis_probables','incertains','perdus_tardifs',
    'vides','vides_sans_texte','illisibles','erreurs_google','erreurs_google_quota',
    'delais_google','erreurs_apres_google','pannes_avant_google','refus_limiteur',
    'images_refusees','requetes_invalides','exceptions','non_classes','servis_par_secours',
    'fins_longueur','fins_filtre','fins_autres','limiteur_ouvert','t_moins_5','t_5_10','t_10_20','t_20_30','t_30_60',
    't_60_75','t_plus_75','servis_lents'];

  // Une ligne lue, ou la raison pour laquelle elle ne l'est pas.
  function ligneScan(r){
    if(!r || typeof r.jour !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.jour))
      return { cause:'jour illisible' };
    var o = { jour: r.jour };
    for(var i=0;i<SCAN_COLONNES.length;i++){
      var v = entierOuNul(r[SCAN_COLONNES[i]]);
      if(v === null || v < 0) return { cause:'colonne « ' + SCAN_COLONNES[i] + ' » illisible' };
      o[SCAN_COLONNES[i]] = v;
    }
    if(o.vides_sans_texte > o.vides)
      return { cause:'le ' + jourTexte(r.jour) + ', plus de listes vides « sans texte » que de listes vides' };
    o.echecs = o.illisibles + o.erreurs_google + o.delais_google + o.erreurs_apres_google;
    o.lentes = o.t_30_60 + o.t_60_75 + o.t_plus_75;
    if(o.servis_probables + o.incertains + o.perdus_tardifs + o.vides + o.echecs !== o.envoyes)
      return { cause:'le ' + jourTexte(r.jour) + ', les issues ne font pas le total des tentatives' };
    if(o.t_moins_5 + o.t_5_10 + o.t_10_20 + o.t_20_30 + o.t_30_60 + o.t_60_75 + o.t_plus_75 !== o.envoyes)
      return { cause:'le ' + jourTexte(r.jour) + ', les durées ne font pas le total des tentatives' };
    return o;
  }

  // Toutes les lignes, ou `{ cause }` des qu'une seule est illisible.
  function lignesScan(rows){
    if(!Array.isArray(rows)) return { cause:'la vue n’a rien rendu' };
    var out = [];
    for(var i=0;i<rows.length;i++){
      var l = ligneScan(rows[i]);
      if(l.cause) return l;
      out.push(l);
    }
    return { lignes: out };
  }

  function pctScan(n, sur){
    return sur > 0 ? Math.round(100 * n / sur) + ' %' : '—';
  }

  // Le jour de reference vient de la base (`v_admin_resume.jour_serveur`),
  // jamais de l'horloge du poste. Absent : on ne calcule pas de fenetre.
  function jourServeurValide(resume){
    var j = resume && resume.jour_serveur;
    return (typeof j === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j)
            && isFinite(Date.parse(j + 'T00:00:00Z'))) ? j : null;
  }
  function jourMoins(j, n){
    return new Date(Date.parse(j + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  }
  // ── index.html, lignes 3193 à 3233 (copie) ──
  var MESURE_JALONS = ['jalon_accueil','jalon_revenu_j1','jalon_revenu_j2_7','jalon_revenu_j8_30',
    'jalon_accueil_v2','jalon_creation_jour_essai','jalon_creation_plus_tard'];
  var MESURE_ECRANS = ['ecran_pilulier','ecran_traitements','ecran_historique','ecran_horaires',
    'ecran_reglages','ecran_abonnement','ecran_aide','ecran_confidentialite','ecran_validation',
    'ecran_prise','ecran_config_horaires'];
  var MESURE_SCAN = ['scan_lance','scan_renouvellement','quota_atteint','photo_obtenue',
    'photo_non_obtenue','consentement_affiche','consentement_refuse','saisie_manuelle_choisie',
    'recadrage_annule','recadrage_indisponible','analyse_envoyee','liste_recue','echec_affiche'];

  var MESURE_LIBELLES = {
    jalon_accueil:'Accueil accepté', jalon_revenu_j1:'Revenu le lendemain',
    jalon_revenu_j2_7:'Revenu du 2ᵉ au 7ᵉ jour', jalon_revenu_j8_30:'Revenu du 8ᵉ au 30ᵉ jour',
    jalon_accueil_v2:'Accueil accepté en 1.4.19 ou plus',
    jalon_creation_jour_essai:'1ᵉʳ traitement le jour du 1ᵉʳ essai',
    jalon_creation_plus_tard:'1ᵉʳ traitement plus tard (30 jours au plus)',
    ecran_pilulier:'Pilulier', ecran_traitements:'Traitements', ecran_historique:'Historique',
    ecran_horaires:'Horaires', ecran_reglages:'Réglages', ecran_abonnement:'Abonnement',
    ecran_aide:'Aide', ecran_confidentialite:'Confidentialité', ecran_validation:'Validation',
    ecran_prise:'Détail d’une prise', ecran_config_horaires:'Configuration des horaires',
    scan_lance:'Scan lancé', scan_renouvellement:'dont renouvellements d’ordonnance',
    quota_atteint:'Quota de scans atteint', photo_obtenue:'Photo obtenue',
    photo_non_obtenue:'Photo non obtenue (annulation, refus caméra, échec)',
    consentement_affiche:'Consentement affiché', consentement_refuse:'Consentement refusé',
    saisie_manuelle_choisie:'Saisie manuelle choisie', recadrage_annule:'Recadrage abandonné',
    recadrage_indisponible:'Recadrage indisponible', analyse_envoyee:'Analyse envoyée',
    liste_recue:'Liste reçue', echec_affiche:'Échec affiché au patient'
  };

  var MESURE_PLATEFORMES = { and:'Android', ios:'iPhone', web:'Navigateur' };

  // Décalage du dénominateur, EN SEMAINES, pour chaque jalon de retour.
  // ⚠️ POUR J1 IL VAUT ZERO, ET CE N'EST PAS UNE PROTECTION. Les compteurs sont
  // hebdomadaires : on ne sait pas décaler de deux jours. Le taux J1 est donc
  // SOUS-ESTIME quand les arrivées montent — les accueils de fin de semaine
  // reviennent la semaine suivante, hors du numérateur. C'est écrit à l'écran,
  // à côté du chiffre, pas seulement dans le repli.
  var MESURE_DECALAGE = { jalon_revenu_j1:0, jalon_revenu_j2_7:1, jalon_revenu_j8_30:3 };

  // Sous ce seuil, aucune case n'est exploitée : règle de CONFIDENTIALITE posée
  // le 21/09. Ce n'est PAS un seuil de décision — c'est la fourchette qui le dit.
  var MESURE_PLANCHER = 10;
  // ── index.html, lignes 3256 à 3263 (copie) ──
  var MESURE_PLAFOND = 1000;

  function aPropriete(o, c){ return Object.prototype.hasOwnProperty.call(o, c); }

  function estCleMesure(c){
    return MESURE_JALONS.indexOf(c) >= 0 || MESURE_ECRANS.indexOf(c) >= 0
        || MESURE_SCAN.indexOf(c) >= 0 || c === 'rejet';
  }
  // ── index.html, lignes 3265 à 3351 (copie) ──
  /**
   * Lit et agrège les lignes de `v_admin_mesure`.
   * Rend `{ cause }` si une seule ligne est illisible, sinon l'agrégat.
   * `avecTest` : l'interrupteur de périmètre de la page.
   *
   * ⚠️ `total`, `parPlateforme` et `parAnciennete` ne comptent QUE les clés
   * connues, et JAMAIS `rejet` : `rejet` n'est pas un geste de l'utilisateur,
   * c'est un incident de la mesure elle-même.
   * ⚠️ `rejetTotal` est compté AVANT le filtre de périmètre : une charge
   * fabriquée peut se déclarer « appareil de test », et un compteur d'anomalie
   * ne doit pas dépendre d'un drapeau que n'importe qui peut poser.
   */
  function agregerMesure(rows, avecTest){
    if(!Array.isArray(rows)) return { cause:'la vue n’a rien rendu' };
    if(rows.length >= MESURE_PLAFOND && rows.lectureComplete !== true)   // lecture.js a tout lu (ne pas copier `rows` avant ce test)
      return { cause:'la vue a rendu ' + rows.length + ' lignes, soit le plafond de la base ('
                   + MESURE_PLAFOND + ') : la liste est probablement TRONQUÉE, et une semaine '
                   + 'amputée fausserait la rétention sans prévenir' };
    var parSemaine = {}, total = {}, parPlateforme = {}, parAnciennete = {};
    var versions = {}, inconnues = {}, semaineEnCours = null, ecartees = 0, rejetTotal = 0;

    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      if(!r || typeof r.semaine !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.semaine))
        return { cause:'semaine illisible' };
      if(typeof r.cle !== 'string' || !r.cle)
        return { cause:'clé illisible, semaine du ' + jourTexte(r.semaine) };
      if(typeof r.plateforme !== 'string' || !aPropriete(MESURE_PLATEFORMES, r.plateforme))
        return { cause:'plateforme inconnue « ' + String(r.plateforme) + ' »' };
      if(typeof r.version !== 'string' || !/^\d{2}\.\d{2}$/.test(r.version))
        return { cause:'version illisible « ' + String(r.version) + ' »' };
      if(r.anciennete !== 'r' && r.anciennete !== 'a')
        return { cause:'ancienneté illisible, semaine du ' + jourTexte(r.semaine) };
      if(typeof r.test !== 'boolean')
        return { cause:'colonne « test » illisible, semaine du ' + jourTexte(r.semaine) };
      if(typeof r.semaine_en_cours !== 'boolean')
        return { cause:'colonne « semaine_en_cours » illisible — la migration du 22/09 est-elle passée ?' };
      var n = entierOuNul(r.n);
      if(n === null || n <= 0)
        return { cause:'compteur illisible pour « ' + r.cle + ' », semaine du ' + jourTexte(r.semaine) };

      if(r.semaine_en_cours){
        if(semaineEnCours !== null && semaineEnCours !== r.semaine)
          return { cause:'deux semaines différentes se disent « en cours »' };
        semaineEnCours = r.semaine;
      }

      var connue = estCleMesure(r.cle);
      if(!connue) inconnues[r.cle] = (aPropriete(inconnues, r.cle) ? inconnues[r.cle] : 0) + n;
      if(r.cle === 'rejet'){ rejetTotal += n; continue; }
      if(!avecTest && r.test){ ecartees += n; continue; }
      if(!connue) continue;

      if(!aPropriete(parSemaine, r.semaine))
        parSemaine[r.semaine] = { _enCours: !!r.semaine_en_cours, _cases:{} };
      var sc = parSemaine[r.semaine]._cases;
      sc[r.cle] = (aPropriete(sc, r.cle) ? sc[r.cle] : 0) + n;
      total[r.cle] = (aPropriete(total, r.cle) ? total[r.cle] : 0) + n;
      if(!aPropriete(parPlateforme, r.plateforme)) parPlateforme[r.plateforme] = { _tot:0, _cases:{} };
      var pc = parPlateforme[r.plateforme];
      pc._cases[r.cle] = (aPropriete(pc._cases, r.cle) ? pc._cases[r.cle] : 0) + n;
      // `jalon_accueil_v2` DOUBLE `jalon_accueil` (même geste, installations
      // 1.4.19+) : il ne gonfle pas les « événements comptés ».
      if(r.cle === 'jalon_accueil_v2') continue;
      pc._tot += n;
      parAnciennete[r.anciennete] = (aPropriete(parAnciennete, r.anciennete) ? parAnciennete[r.anciennete] : 0) + n;
      versions[r.version] = (aPropriete(versions, r.version) ? versions[r.version] : 0) + n;
    }

    return { semaines: Object.keys(parSemaine).sort().reverse(),
             parSemaine:parSemaine, total:total,
             parPlateforme:parPlateforme, parAnciennete:parAnciennete, versions:versions,
             semaineEnCours:semaineEnCours, clesInconnues: Object.keys(inconnues).sort(),
             ecartees:ecartees, rejetTotal:rejetTotal };
  }

  function totalMesure(a, cle){ return aPropriete(a.total, cle) ? a.total[cle] : 0; }
  function caseMesure(a, semaine, cle){
    if(!aPropriete(a.parSemaine, semaine)) return 0;
    var c = a.parSemaine[semaine]._cases;
    return aPropriete(c, cle) ? c[cle] : 0;
  }

  // La semaine précédant `s` de `k` semaines (les semaines sont des lundis UTC).
  function semaineMoins(s, k){
    return new Date(Date.parse(s + 'T00:00:00Z') - k * 7 * 86400000).toISOString().slice(0,10);
  }
  // ── index.html, lignes 3353 à 3445 (copie) ──
  /**
   * Fourchette de Wilson à 95 %, en POINTS de pourcentage : { bas, haut }.
   * ⚠️ PAS DE « ± » SYMETRIQUE, ET PAS DE WALD. La formule usuelle
   * 1,96·√(p(1−p)/n) rend ZERO quand p vaut 0 ou 1 — c'est-à-dire exactement
   * au démarrage, quand on a dix accueils et aucun retour. Elle afficherait
   * « 0 % ± 0 point », soit une certitude parfaite tirée de rien.
   * Wilson reste valide aux bords et aux petits effectifs.
   */
  function fourchetteMesure(succes, sur){
    if(!sur || sur < 0 || succes < 0 || succes > sur) return null;
    var z = 1.96, p = succes / sur, d = 1 + z * z / sur;
    var centre = (p + z * z / (2 * sur)) / d;
    var demi = (z * Math.sqrt(p * (1 - p) / sur + z * z / (4 * sur * sur))) / d;
    var bas = Math.round(1000 * (centre - demi)) / 10;
    var haut = Math.round(1000 * (centre + demi)) / 10;
    return { bas: bas < 0 ? 0 : bas, haut: haut > 100 ? 100 : haut };
  }

  /**
   * Rétention : les 4 dernières semaines CLOSES au numérateur, autant de
   * semaines au dénominateur, DECALEES du délai du jalon.
   * Une semaine absente — au numérateur comme au dénominateur — interdit le
   * calcul : une semaine sans remontée n'est pas une semaine à zéro.
   */
  function retentionMesure(a){
    var closes = [];
    for(var i=0;i<a.semaines.length;i++){
      if(!a.parSemaine[a.semaines[i]]._enCours) closes.push(a.semaines[i]);
    }
    if(!closes.length) return { cause:'aucune semaine close : la mesure a moins d’une semaine' };
    var fin = closes[0], fenetre = 4, out = [];
    var jalons = ['jalon_revenu_j1','jalon_revenu_j2_7','jalon_revenu_j8_30'];
    for(var k=0;k<jalons.length;k++){
      var jalon = jalons[k], d = MESURE_DECALAGE[jalon];
      var num = 0, den = 0, manque = null, sNum = [], sDen = [];
      for(var w=0; w<fenetre; w++){
        var sn = semaineMoins(fin, w), sd = semaineMoins(fin, w + d);
        sNum.push(sn); sDen.push(sd);
        if(!aPropriete(a.parSemaine, sn) && manque === null) manque = sn;
        if(!aPropriete(a.parSemaine, sd) && manque === null) manque = sd;
        num += caseMesure(a, sn, jalon);
        den += caseMesure(a, sd, 'jalon_accueil');
      }
      out.push({ jalon:jalon, num:num, den:den, decalage:d,
                 debutNum:sNum[sNum.length-1], finNum:sNum[0],
                 debutDen:sDen[sDen.length-1], finDen:sDen[0],
                 manque:manque });
    }
    return { lignes:out, fin:fin, fenetre:fenetre };
  }

  /**
   * MESURE v2 (1.4.19) : le PREMIER TRAITEMENT, sur les 4 dernières semaines
   * CLOSES — les mêmes que la rétention.
   * Numérateur : jalon_creation_jour_essai + jalon_creation_plus_tard.
   * Dénominateur : jalon_accueil_v2 (accueils des installations 1.4.19+ ; pas
   * jalon_accueil, qui mélange 1.4.18 et 1.4.19 sous la même version « 01.04 »).
   * ⚠️ UN FLUX, PAS UNE COHORTE, ET SANS DÉCALAGE : un jalon est compté la
   * semaine où il remonte, jusqu'à 30 jours après l'accueil. La base ne rend ces
   * trois clés que pour les semaines CLOSES (vue `v_admin_mesure`).
   * Une semaine absente interdit le calcul, comme pour la rétention.
   */
  function premierTraitementMesure(a){
    var closes = [];
    for(var i=0;i<a.semaines.length;i++){
      if(!a.parSemaine[a.semaines[i]]._enCours) closes.push(a.semaines[i]);
    }
    if(!closes.length) return { cause:'aucune semaine close' };
    var fin = closes[0], fenetre = 4, jour = 0, tard = 0, den = 0, manque = null, debut = fin;
    for(var w=0; w<fenetre; w++){
      var s = semaineMoins(fin, w);
      debut = s;
      if(!aPropriete(a.parSemaine, s) && manque === null) manque = s;
      jour += caseMesure(a, s, 'jalon_creation_jour_essai');
      tard += caseMesure(a, s, 'jalon_creation_plus_tard');
      den += caseMesure(a, s, 'jalon_accueil_v2');
    }
    return { jour:jour, tard:tard, num:jour + tard, den:den, debut:debut, fin:fin,
             fenetre:fenetre, manque:manque };
  }

  // Les accueils TOUTES VERSIONS sur la même fenêtre : dit quelle part des
  // arrivées la mesure 1.4.19 représente pendant la montée en charge.
  function accueilsToutesVersions(a, pt){
    var t = 0;
    for(var w=0; w<pt.fenetre; w++) t += caseMesure(a, semaineMoins(pt.fin, w), 'jalon_accueil');
    return t;
  }

  function pctMesure(n, sur){
    // Virgule décimale, à la française (26/09/2026).
    return sur > 0 ? String(Math.round(1000 * n / sur) / 10).replace('.', ',') + ' %' : '—';
  }
  // ── index.html, lignes 3983 à 4002 (copie) ──
  var AUDIENCE_LIBELLES = {
    customers_new:    'New Customers',
    customers_active: 'Active Customers',
    trials:           'Active Trials'
  };

  function audienceLibellesConformes(mesures){
    if(!mesures || !mesures.length) return false;
    for(var g in AUDIENCE_LIBELLES){
      if(!Object.prototype.hasOwnProperty.call(AUDIENCE_LIBELLES, g)) continue;
      var trouve = null;
      for(var i=0;i<mesures.length;i++){
        if(mesures[i].graphique === g && Number(mesures[i].mesure_index) === 0){
          trouve = mesures[i].libelle;
        }
      }
      if(trouve !== AUDIENCE_LIBELLES[g]) return false;
    }
    return true;
  }
  // ── index.html, lignes 4523 à 4536 (copie) ──
  // Un nombre décimal lisible (montants), ou null. Même esprit que
  // `entierOuNul` : une chaîne vide ou un booléen ne sont pas zéro.
  function decimalOuNul(v){
    if(typeof v === 'number') return isFinite(v) ? v : null;
    if(typeof v !== 'string') return null;
    var s = v.replace(/^\s+|\s+$/g, '');
    if(s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }

  var fmtJourLong = new Intl.DateTimeFormat('fr-FR',
    { timeZone:'UTC', weekday:'long', day:'numeric', month:'long' });
  function jourValide(j){ return typeof j === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j) && isFinite(Date.parse(j + 'T00:00:00Z')); }
  function jourLong(j){ return jourValide(j) ? fmtJourLong.format(new Date(Date.parse(j + 'T00:00:00Z'))) : '(date illisible)'; }
  // ── index.html, lignes 4564 à 4574 (copie) ──
  // Lundi (UTC) de la semaine qui contient `j`.
  function lundiDe(j){
    var t = Date.parse(j + 'T00:00:00Z'), dow = new Date(t).getUTCDay();
    return new Date(t - ((dow + 6) % 7) * 86400000).toISOString().slice(0, 10);
  }

  function montantTexte(m, devise){
    var s = (Math.round(m * 100) / 100).toFixed(2).replace('.', ',');
    return devise === 'EUR' ? s + ' €' : s + ' ' + (devise || '');
  }
  function unDecimal(x){ return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  racine.TDCalc = {
    ech:ech, nb:nb, entierOuNul:entierOuNul, decimalOuNul:decimalOuNul, jourTexte:jourTexte,
    moisTexte:moisTexte, jourValide:jourValide, jourLong:jourLong, lundiDe:lundiDe,
    montantTexte:montantTexte, unDecimal:unDecimal, jourServeurValide:jourServeurValide,
    jourMoins:jourMoins, ligneScan:ligneScan, lignesScan:lignesScan, pctScan:pctScan,
    agregerMesure:agregerMesure, totalMesure:totalMesure, caseMesure:caseMesure,
    semaineMoins:semaineMoins, fourchetteMesure:fourchetteMesure, retentionMesure:retentionMesure,
    premierTraitementMesure:premierTraitementMesure, accueilsToutesVersions:accueilsToutesVersions,
    pctMesure:pctMesure, estCleMesure:estCleMesure, aPropriete:aPropriete,
    audienceLibellesConformes:audienceLibellesConformes,
    MESURE_JALONS:MESURE_JALONS, MESURE_ECRANS:MESURE_ECRANS, MESURE_SCAN:MESURE_SCAN,
    MESURE_PLATEFORMES:MESURE_PLATEFORMES, MESURE_DECALAGE:MESURE_DECALAGE,
    MESURE_PLANCHER:MESURE_PLANCHER, MESURE_PLAFOND:MESURE_PLAFOND
  };
})(typeof window !== 'undefined' ? window : this);
