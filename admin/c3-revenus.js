/* ============================================================================
 * CONSOLE PILOU — LOT C3 « REVENUS NETS » — 26/09/2026 (v2 après revue adverse)
 * ============================================================================
 * Fichier À PART, pour que `index.html` ne grossisse plus (règle du 26/09).
 * ES5 strict, aucune dépendance, aucune requête réseau : il ne fait que
 * METTRE EN PAGE des lignes déjà lues par `index.html`, avec les outils que
 * celle-ci lui passe (`o`). Il n'expose qu'un objet : `window.PilouC3`.
 *
 * ⚠️ MIEUX VAUT RIEN QU'UN CHIFFRE FAUX (règle de la console depuis le 24/09).
 * Une ligne illisible met le bloc en ROUGE et n'affiche aucun total.
 *
 * Conventions (plan C3 v2) :
 *   • jours et mois en heure universelle, comme l'accueil ;
 *   • net = `net_encaisse` (le même que le tableau officine), calculé en base ;
 *   • les devises ne s'additionnent jamais ; les commissions sont en euros ;
 *   • règle des commissions (Gaétan, 26/09) : 50 % du net, plafond 1,00 € par
 *     mois payé et 9,00 € par année payée, à vie tant que l'abonné paie, sur le
 *     net AVANT les impôts de Gaétan. Le calcul est fait EN BASE
 *     (`v_admin_commissions_mois`) ; ce fichier ne fait que l'afficher.
 * ========================================================================== */
(function(){
  'use strict';

  var RE_JOUR = /^\d{4}-\d{2}-\d{2}$/, RE_DEVISE = /^[A-Z]{3}$/;
  var NOM_MAGASIN = { PLAY_STORE:'Google Play', APP_STORE:'App Store' };
  var NOM_FORMULE = { mensuel:'Mensuel', annuel:'Annuel', autre:'Autre formule' };
  var LIMITE_NET = 'Ce que Google et Apple vous doivent, après TVA et leur part, remboursements '
    + 'déduits. Pas encore sur votre compte : ils versent plus tard. Avant vos cotisations et impôts. '
    + 'Jours en heure universelle.';

  // Un peu de style, injecté une fois : `index.html` ne grossit pas.
  (function style(){
    if(typeof document === 'undefined' || document.getElementById('c3-style')) return;
    var s = document.createElement('style'); s.id = 'c3-style';
    s.textContent = ''
      + '.c3-bloc{background:var(--carte);border:1px solid var(--trait);border-radius:18px;'
      + 'box-shadow:var(--ombre);padding:18px 20px;margin-top:14px}'
      + '.c3-bloc h3{font-size:16px;margin:0}.c3-quand{font-size:13px;color:var(--encre-2);margin-top:2px}'
      + '.c3-grand{font-size:38px;font-weight:720;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin-top:10px}'
      + '.c3-pas{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:var(--encre-2);'
      + 'padding:5px 0;border-bottom:1px solid var(--trait);font-variant-numeric:tabular-nums}'
      + '.c3-pas.net{color:var(--encre);font-weight:650;border-bottom:0}'
      + '.c3-rouge{color:var(--critique);font-weight:650}.c3-orange{color:var(--attention);font-weight:650}'
      + '.c3-bloc .cadre{margin-top:12px}';
    document.head.appendChild(s);
  })();

  // ── Lecture stricte des nombres (même idée que `decimalOuNul` de la page) ──
  function dec(v){
    if(typeof v === 'number') return isFinite(v) ? v : null;
    if(typeof v !== 'string') return null;
    var s = v.replace(/^\s+|\s+$/g, '');
    if(s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }
  // Un nombre optionnel : null reste null (somme vide), un texte illisible fait échouer.
  function decOpt(v, ko){ if(v === null || v === undefined) return 0; var x = dec(v); if(x === null) ko.push(1); return x || 0; }
  function ent(v, ko){ var x = dec(v); if(x === null || x % 1 !== 0 || x < 0){ ko.push(1); return 0; } return x; }
  function cent(x){ return Math.round(x * 100) / 100; }
  function devisesTexte(o, parDevise){
    var ks = Object.keys(parDevise).sort(function(a, b){ return a === 'EUR' ? -1 : b === 'EUR' ? 1 : (a < b ? -1 : 1); });
    var t = [];
    for(var i=0;i<ks.length;i++) t.push(o.montantTexte(parDevise[ks[i]], ks[i]));
    return t.length ? t.join(' + ') : o.montantTexte(0, 'EUR');
  }
  function ajoute(obj, k, v){ obj[k] = (obj[k] || 0) + v; }
  function nb(n, un, plusieurs){ return n + ' ' + (n > 1 ? plusieurs : un); }

  // ── 1. TUILE « NET DU MOIS » (accueil) ─────────────────────────────────────
  // Grand chiffre = le mois (UTC) jusqu'à la fin de la période choisie ;
  // sous-ligne = la période elle-même (décision de Gaétan, 26/09).
  function tuileNetMois(rows, auj, per, o){
    var nom = 'Net du mois';
    function illisible(cause){
      return { illisible:true, html: o.tuileAccueil({ nom:nom, grand:'—', illisible:true,
        sous:'Non lu : ' + cause + '. N’en concluez rien.', limite:LIMITE_NET }) };
    }
    if(auj === null) return illisible('la date de la base manque');
    if(!Array.isArray(rows)) return illisible('la vue n’a rien rendu');
    if(rows.length >= 1000) return illisible('la vue a rendu 1000 lignes (tronquée)');
    var debut, fin;
    if(per === 'semaine'){ debut = o.jourMoins(o.lundiDe(auj), 7); fin = o.jourMoins(o.lundiDe(auj), 1); }
    else { debut = fin = (per === 'hier' ? o.jourMoins(auj, 1) : auj); }
    var mois = fin.slice(0, 7), moisN = {}, perN = {}, brutMois = {}, pai = 0, remb = 0, sansNet = 0, rembSansNet = 0, annules = 0;
    for(var i=0;i<rows.length;i++){
      var r = rows[i], ko = [];
      if(!r || typeof r.jour !== 'string' || !RE_JOUR.test(r.jour) || typeof r.devise !== 'string' || !RE_DEVISE.test(r.devise))
        return illisible('une ligne illisible');
      var p = ent(r.paiements, ko), rb = ent(r.remboursements, ko), sn = ent(r.sans_net, ko), rsn = ent(r.remb_sans_net, ko), ann = ent(r.remboursements_annules, ko);
      var net = decOpt(r.net, ko) + decOpt(r.remb_net, ko), brut = decOpt(r.brut, ko);
      if(ko.length) return illisible('une ligne illisible le ' + o.jourLong(r.jour));
      if(r.jour.slice(0, 7) === mois && r.jour <= fin){
        ajoute(moisN, r.devise, net); ajoute(brutMois, r.devise, brut); remb += rb; sansNet += sn; rembSansNet += rsn; annules += ann;
      }
      if(r.jour >= debut && r.jour <= fin){ ajoute(perN, r.devise, net); pai += p; }
    }
    var quand = per === 'semaine' ? 'semaine close' : (per === 'hier' ? 'hier' : 'aujourd’hui');
    // Grand chiffre : les euros seuls. Une autre devise va en sous-ligne, jamais additionnée.
    var enEuros = {}, autresDev = {};
    for(var dv in moisN) if(moisN.hasOwnProperty(dv)){ if(dv === 'EUR') enEuros.EUR = moisN[dv]; else autresDev[dv] = moisN[dv]; }
    var sous = 'Jusqu’au ' + o.jourLong(fin) + ' inclus · ' + quand + ' : ' + devisesTexte(o, perN)
      + (pai ? ' (' + pai + ' paiement' + (pai > 1 ? 's' : '') + ')' : '')
      + ' · brut du mois ' + devisesTexte(o, brutMois)
      + (remb - rembSansNet > 0 ? ' · ' + nb(remb - rembSansNet, 'remboursement déduit', 'remboursements déduits') : '')
      + (Object.keys(autresDev).length ? ' · autre devise ce mois-ci : ' + devisesTexte(o, autresDev) : '')
      + (sansNet ? ' · ' + nb(sansNet, 'paiement sans net', 'paiements sans net') + ' (taux manquant, non compté)' : '')
      + (rembSansNet ? ' · ' + nb(rembSansNet, 'remboursement sans net', 'remboursements sans net') + ' (taux manquant, NON déduit)' : '')
      + (annules ? ' · ' + nb(annules, 'remboursement annulé', 'remboursements annulés') + ' par Apple (encore déduit, à corriger à la main)' : '');
    return { illisible:false, html: o.tuileAccueil({ nom:nom, badge: per === 'aujourdhui' ? 'journée en cours' : '',
      grand: devisesTexte(o, enEuros), unite: o.moisTexte(mois + '-01'), sous: sous,
      sousAttention: sansNet + rembSansNet + annules > 0, limite: LIMITE_NET }) };
  }

  // ── 2. SECTION « ARGENT » : LES BLOCS C3 ──────────────────────────────────
  function bloc(titre, quand, corps){
    return '<div class="c3-bloc"><h3>' + titre + '</h3>' + (quand ? '<div class="c3-quand">' + quand + '</div>' : '') + corps + '</div>';
  }
  function rouge(o, titre, cause){
    return bloc(o.ech(titre), '', '<div class="rien c3-rouge">Non lu : ' + o.ech(cause)
      + '. Aucun chiffre n’est affiché — mieux vaut rien qu’un chiffre faux.</div>');
  }

  function section(d, auj, o){
    var out = { html:'', critique:0, attention:0 };
    // (a) La garde et les paiements attendus. ⚠️ CETTE VUE REND TOUJOURS UNE
    // LIGNE À L'ADMINISTRATEUR : si elle manque, la garde `prive.admins` est
    // fermée (par exemple après une restauration) et TOUTES les vues C3
    // rendent zéro ligne — ce qui ressemblerait à « aucune vente ». On s'arrête.
    var a = d.attendus;
    if(!a || typeof a !== 'object'){
      out.critique++;
      out.html = rouge(o, 'Revenus nets', 'la vue des paiements attendus n’a rien rendu : le compte '
        + 'administrateur n’est peut-être plus dans prive.admins (voir la procédure de restauration)');
      return out;
    }
    var ko0 = [], manq = ent(a.periodes_sans_suite, ko0);
    if(ko0.length){ out.critique++; out.html = rouge(o, 'Paiements attendus', 'compte illisible'); return out; }
    if(manq > 0){
      out.critique++;
      out.html += bloc('Paiements attendus', '', '<div class="rien c3-rouge">' + manq + ' période'
        + (manq > 1 ? 's payées sont restées' : ' payée est restée') + ' sans suite (plus ancienne fin : '
        + o.ech(o.jourLong(String(a.plus_ancienne_fin || '').slice(0, 10))) + '). Un renouvellement ou une '
        + 'expiration aurait dû arriver. Regardez l’historique des webhooks dans RevenueCat et les '
        + 'commandes Google / Apple avant tout virement.</div>');
    } else {
      out.html += '<div class="rien">Paiements attendus : <b>aucun manquant</b>. Chaque période payée a '
        + 'eu sa suite (renouvellement ou expiration). Un tout premier achat perdu ne se voit pas ici : '
        + 'le contrôle mensuel avant virement le rattrape.</div>';
    }

    // (b) Revenus nets du mois (UTC) en cours.
    if(auj === null){ out.critique++; out.html += rouge(o, 'Revenus nets', 'la date de la base manque'); return out; }
    if(!Array.isArray(d.netMois) || d.netMois.length >= 1000){ out.critique++; out.html += rouge(o, 'Revenus nets', 'la vue mensuelle n’a rien rendu ou est tronquée'); return out; }
    if(!Array.isArray(d.commissions) || d.commissions.length >= 1000){ out.critique++; out.html += rouge(o, 'À verser aux apporteurs', 'la vue des commissions n’a rien rendu ou est tronquée'); return out; }
    var parMois = {}, i, r, ko = [];
    for(i=0;i<d.netMois.length;i++){
      r = d.netMois[i];
      if(!r || typeof r.mois !== 'string' || !RE_JOUR.test(r.mois) || typeof r.devise !== 'string' || !RE_DEVISE.test(r.devise)){ ko.push(1); break; }
      var m = r.mois.slice(0, 7), k = m + '|' + r.devise;
      var L = parMois[k] || (parMois[k] = { mois:m, devise:r.devise, pai:0, remb:0, brut:0, brutNet:0, taxe:0, net:0, rembNet:0, sansNet:0, rembSansNet:0, annules:0, magasins:{}, formules:{} });
      var e = { pai:ent(r.paiements, ko), remb:ent(r.remboursements, ko), brut:decOpt(r.brut, ko), brutNet:decOpt(r.brut_avec_net, ko),
                taxe:decOpt(r.taxe, ko), net:decOpt(r.net, ko), rembNet:decOpt(r.remb_net, ko), sansNet:ent(r.sans_net, ko),
                rembSansNet:ent(r.remb_sans_net, ko), annules:ent(r.remboursements_annules, ko) };
      for(var c in e) if(e.hasOwnProperty(c)) L[c] += e[c];
      ajoute(L.magasins, r.magasin, e.net + e.rembNet); ajoute(L.formules, r.formule, e.net + e.rembNet);
    }
    if(ko.length){ out.critique++; out.html += rouge(o, 'Revenus nets', 'une ligne mensuelle illisible'); return out; }
    var moisCourant = auj.slice(0, 7), cur = parMois[moisCourant + '|EUR'];
    // Remboursements annulés par Apple (REFUND_REVERSED) : signalés quel que soit le mois.
    var annules = [], ka = Object.keys(parMois).sort();
    for(i=0;i<ka.length;i++) if(parMois[ka[i]].annules) annules.push(o.moisTexte(parMois[ka[i]].mois + '-01') + ' : ' + parMois[ka[i]].annules);
    if(annules.length){
      out.attention++;
      out.html += '<div class="rien avert"><b>Remboursement annulé par Apple</b> (' + o.ech(annules.join(' · '))
        + ') : le remboursement reste déduit du net de son mois, et la commission reprise reste reprise. À corriger à la main avant tout virement.</div>';
    }
    var autres = [];
    for(var kk in parMois) if(parMois.hasOwnProperty(kk) && parMois[kk].mois === moisCourant && parMois[kk].devise !== 'EUR') autres.push(parMois[kk]);
    var titreMois = o.moisTexte(moisCourant + '-01');
    if(!cur){
      out.html += bloc('Revenus nets — ' + o.ech(titreMois), 'Mois en cours, heure universelle · production · euros',
        '<div class="rien">Aucun paiement ce mois-ci pour l’instant.</div>');
    } else {
      var brutR = cent(cur.brutNet), taxeR = cent(cur.taxe), netR = cent(cur.net), partR = cent(brutR - taxeR - netR), rembR = cent(cur.rembNet);
      var casc = '<div class="c3-grand">' + o.ech(o.montantTexte(netR + rembR, 'EUR')) + '</div>'
        + '<div class="c3-quand">nets, sur ' + cur.pai + ' paiement' + (cur.pai > 1 ? 's' : '')
        + (cur.remb ? ' et ' + cur.remb + ' remboursement' + (cur.remb > 1 ? 's' : '') : '') + '</div>'
        + '<div class="c3-pas"><span>Payé par les clients (brut)</span><span>' + o.ech(o.montantTexte(brutR, 'EUR')) + '</span></div>'
        + '<div class="c3-pas"><span>TVA, retenue par le magasin</span><span>' + o.ech(o.montantTexte(-taxeR, 'EUR')) + '</span></div>'
        + '<div class="c3-pas"><span>Part de Google et d’Apple</span><span>' + o.ech(o.montantTexte(-partR, 'EUR')) + '</span></div>'
        + (cur.remb ? '<div class="c3-pas"><span>Remboursements (net)</span><span>' + o.ech(o.montantTexte(rembR, 'EUR')) + '</span></div>' : '')
        + '<div class="c3-pas net"><span>Net pour AGC Logiciels</span><span>' + o.ech(o.montantTexte(netR + rembR, 'EUR')) + '</span></div>';
      if(cur.sansNet || cur.rembSansNet){
        out.attention++;
        casc += '<div class="rien avert"><b>' + nb(cur.sansNet + cur.rembSansNet, 'mouvement sans net', 'mouvements sans net') + '</b> : un taux manquait. '
          + (cur.sansNet ? 'Le brut des paiements concernés (' + o.ech(o.montantTexte(cent(cur.brut - cur.brutNet), 'EUR')) + ') n’est pas compté ci-dessus. ' : '')
          + (cur.rembSansNet ? 'Les remboursements concernés ne sont PAS déduits. ' : '') + 'À vérifier à la main.</div>';
      }
      var lm = [], lf = [];
      for(var mg in cur.magasins) if(cur.magasins.hasOwnProperty(mg)) lm.push({ cases:[{texte:NOM_MAGASIN[mg] || mg}, {texte:o.montantTexte(cur.magasins[mg], 'EUR')}] });
      for(var fo in cur.formules) if(cur.formules.hasOwnProperty(fo)) lf.push({ cases:[{texte:NOM_FORMULE[fo] || fo}, {texte:o.montantTexte(cur.formules[fo], 'EUR')}] });
      casc += '<div class="cadre">' + o.tableau('Par magasin', ['Magasin', 'Net'], lm, 'aucun') + '</div>'
            + '<div class="cadre">' + o.tableau('Par formule', ['Formule', 'Net'], lf, 'aucune') + '</div>';
      for(i=0;i<autres.length;i++) casc += '<div class="rien">Autre devise ce mois-ci : <b>' + o.ech(o.montantTexte(cent(autres[i].net + autres[i].rembNet), autres[i].devise)) + '</b> nets, jamais additionnés aux euros.</div>';
      casc += '<div class="rien">Net = brut × (1 − taux de TVA − part du magasin), aux taux que RevenueCat envoie avec chaque paiement (le même calcul que le tableau officine, rapproché de Google le 12/09). La part des magasins affichée est déduite des arrondis au centime. Pas encore sur votre compte : Google et Apple versent plus tard. Avant vos cotisations et impôts.</div>';
      out.html += bloc('Revenus nets — ' + o.ech(titreMois), 'Mois en cours, heure universelle · production · euros', casc);
    }

    // (c) À verser aux apporteurs, mois par mois (euros). Nos apporteurs internes
    // suivent l'interrupteur « Compter nos tests », comme le tableau officine.
    // À verser d'un mois = somme, par apporteur, de (commission − reprise) ; un
    // solde NÉGATIF n'est jamais soustrait du mois : c'est un report, à déduire
    // à la main du prochain versement à CE même apporteur (orange).
    var toutes = d.commissions, lignes = o.sansNosTests(toutes), la = [], soldes = {}, aVerserMois = {}, reportsMois = {}, reports = [], noms = {};
    for(i=0;i<lignes.length;i++){
      r = lignes[i];
      var kc = [], com = decOpt(r.commission, kc), rep = decOpt(r.reprise, kc), netA = decOpt(r.net, kc), sr = ent(r.sans_regle, kc), pa = ent(r.paiements, kc), rb = ent(r.remboursements, kc);
      if(kc.length || typeof r.mois !== 'string' || !RE_JOUR.test(r.mois) || typeof r.devise !== 'string' || !RE_DEVISE.test(r.devise)){ out.critique++; out.html += rouge(o, 'À verser aux apporteurs', 'une ligne illisible'); return out; }
      if(sr > 0) out.attention++;
      var av = cent(com - rep);
      if(r.devise === 'EUR'){
        var ks0 = r.mois.slice(0, 7) + '|' + String(r.apporteur_id || r.apporteur || '—');
        ajoute(soldes, ks0, av); noms[ks0] = (r.apporteur || '—') + ', ' + o.moisTexte(r.mois);
      }
      la.push({ mois:r.mois, qui:String(r.apporteur || ''), cases:[ {texte:o.moisTexte(r.mois)}, {texte:r.apporteur || '—'}, {texte:r.code || '—'},
        {texte:String(pa)}, {texte:String(rb)}, {texte: pa ? o.montantTexte(netA, r.devise) : '—'}, {texte:o.montantTexte(com, r.devise)},
        {texte: rep ? o.montantTexte(-rep, r.devise) : '—'},
        {texte:o.montantTexte(av, r.devise), classe: av < 0 ? 'attention' : ''},
        {texte:String(sr), classe: sr > 0 ? 'attention' : 'vide'} ] });
    }
    for(var ks in soldes) if(soldes.hasOwnProperty(ks)){
      var sd = cent(soldes[ks]), mk = ks.split('|')[0];
      if(sd < 0){ reports.push(noms[ks] + ' : ' + o.montantTexte(sd, 'EUR')); out.attention++; ajoute(reportsMois, mk, sd); } else ajoute(aVerserMois, mk, sd);
      if(!aVerserMois.hasOwnProperty(mk)) aVerserMois[mk] = 0;
    }
    // Tri sur la date ISO (pas sur le texte du mois), puis l'apporteur.
    la.sort(function(x, y){ return x.mois !== y.mois ? (x.mois < y.mois ? 1 : -1) : (x.qui < y.qui ? -1 : x.qui > y.qui ? 1 : 0); });
    out.html += bloc('À verser aux apporteurs', 'Ce que chaque apporteur peut vous facturer, mois par mois (heure universelle) · euros',
      '<div class="cadre">' + o.tableau('Commissions', ['Mois', 'Apporteur', 'Code', 'Paiements', 'Rembours.', 'Net encaissé', 'Commission', 'Reprise', 'À verser', 'Sans règle'], la,
        'aucun paiement rattaché à un code d’apporteur', 12) + '</div>'
      + o.mentionPerimetre(toutes, o.MOT_INTERNES)
      + (reports.length ? '<div class="rien avert"><b>' + nb(reports.length, 'solde négatif', 'soldes négatifs') + '</b> (' + o.ech(reports.join(' · ')) + ') : un remboursement a repris plus que la commission du mois. Ce report n’est PAS soustrait des totaux ; déduisez-le à la main du prochain versement au même apporteur.</div>' : '')
      + '<div class="rien"><b>Règle</b> (Gaétan, 26/09/2026) : 50 % du net encaissé, plafonné à 1,00 € par mois payé et 9,00 € par année payée ; rien sur un mois offert ; à vie tant que l’abonné paie ; sur le net avant vos impôts. Un remboursement reprend exactement ce qu’il retire de la commission du paiement remboursé (retrouvé par sa transaction) — rien si ce paiement n’avait pas donné de commission ; paiement introuvable : « sans règle ». ⚠️ Aucun remboursement n’a encore été vu en production : cette partie n’est vérifiée que sur des cas d’essai. « Sans règle » : autre devise, taux manquant ou formule inconnue — rien n’est calculé, à voir à la main. L’interrupteur « Compter nos tests » ne change que ce tableau et les colonnes « À verser » et « Reste pour vous » ; le net compte tous les paiements de production.<br><br>'
      + '⚠️ <b>Ce tableau calcule, il ne fige rien</b> : un mois ancien peut encore changer (effacements automatiques des données anciennes). Réglez chaque mois dans le mois qui suit et gardez la facture de l’apporteur ; le mois arrêté (montants figés avec la référence du virement) arrive au lot suivant. Avant de payer, comparez le net du mois aux rapports de paiement de Google et d’Apple.</div>');

    // (d) Mois par mois.
    for(var ma in aVerserMois) if(aVerserMois.hasOwnProperty(ma) && !parMois[ma + '|EUR'])
      parMois[ma + '|EUR'] = { mois:ma, devise:'EUR', pai:0, remb:0, brut:0, net:0, rembNet:0, sansNet:0, rembSansNet:0 };
    var lmm = [], cles = Object.keys(parMois).sort().reverse();
    for(i=0;i<cles.length;i++){
      var P = parMois[cles[i]], netT = cent(P.net + P.rembNet), avm = P.devise === 'EUR' ? cent(aVerserMois[P.mois] || 0) : null;
      lmm.push({ grisee: P.mois === moisCourant, cases:[ {texte:o.moisTexte(P.mois + '-01') + (P.mois === moisCourant ? ' (en cours)' : '')}, {texte:P.devise},
        {texte:String(P.pai)}, {texte:String(P.remb)}, {texte:o.montantTexte(P.brut, P.devise)}, {texte:o.montantTexte(netT, P.devise)},
        {texte:String(P.sansNet + P.rembSansNet), classe:(P.sansNet + P.rembSansNet) ? 'attention' : 'vide'},
        {texte: avm === null ? '—' : o.montantTexte(avm, 'EUR') + (P.devise === 'EUR' && reportsMois[P.mois] ? ' (report ' + o.montantTexte(cent(reportsMois[P.mois]), 'EUR') + ')' : ''),
         classe: P.devise === 'EUR' && reportsMois[P.mois] ? 'attention' : ''}, {texte: avm === null ? '—' : o.montantTexte(cent(netT - avm), 'EUR')} ] });
    }
    out.html += bloc('Mois par mois', 'Production · heure universelle · une ligne par devise',
      '<div class="cadre">' + o.tableau('Mois par mois', ['Mois', 'Devise', 'Paiements', 'Rembours.', 'Brut', 'Net', 'Sans net', 'À verser', 'Reste pour vous'], lmm, 'aucun paiement enregistré', 12) + '</div>'
      + '<div class="rien">« Reste pour vous » = net − à verser aux apporteurs, avant vos cotisations et impôts. Rien n’est enregistré avant le 8 septembre 2026 (branchement du webhook). '
      + '<b>Essais → payants</b> : bloc en attente — il faut d’abord savoir si l’essai gratuit Google Play est encore actif (K5) et enregistrer la conversion d’essai que RevenueCat envoie.</div>');
    return out;
  }

  window.PilouC3 = { version:'2', tuileNetMois:tuileNetMois, section:section };
})();
