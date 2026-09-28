/* ============================================================================
 * CONSOLE PILOU — GRILLE « ALERTES » — sortie de index.html le 28/09/2026 (lot V0)
 * ============================================================================
 * Fichier À PART, pour que `index.html` maigrisse (règle « aucun fichier ne
 * grossit », rétablie par le lot V0 de la console v2). Le corps de la fonction
 * est RECOPIÉ À L'IDENTIQUE depuis index.html (commit bbcc153, lignes 1694 à
 * 1991) : seuls changent l'emballage et la façon de recevoir les outils de la
 * page, passés en paramètre (`o`) comme pour `c3-revenus.js`.
 * ES5 strict, aucune dépendance, aucune requête réseau. N'expose qu'un objet :
 * `window.PilouAlertes`.
 *
 * ⚠️ MODULE ABSENT = GRILLE ROUGE, JAMAIS UNE PAGE ENTIERE EN PANNE : c'est
 * `index.html` qui le vérifie (voir `rendreAlertes`).
 * ========================================================================== */
(function(){
  'use strict';

  // ⚠️ `sv` A ETE RETIRE DE LA SIGNATURE : son seul usage est parti avec le
  // voyant « Sauvegarde », que la bande « À faire » remplace.
  function rendreAlertes(a, au, o){
    // Outils de la page, sous leur nom d'origine : le corps ci-dessous est
    // celui de index.html, mot pour mot.
    var $ = o.$, indicateur = o.indicateur, heuresDepuis = o.heuresDepuis,
        dureeTexte = o.dureeTexte, quandTexte = o.quandTexte,
        audienceLibellesConformes = o.audienceLibellesConformes, voyantScan = o.voyantScan;

    if(!a){
      // ⚠️ UN VRAI VOYANT, PAS UNE PHRASE. La page rendait ici du texte hors
      // grille tout en comptant 1 rouge : le bandeau annonçait « 1 alerte
      // rouge » et aucun `.ind.critique` n'existait. C'est l'invariant que le
      // test 47 vient d'eriger, viole par la page elle-meme dans le seul cas
      // qu'il ne couvrait pas.
      $('grille-alertes').innerHTML = indicateur('Alertes', 'illisibles', 'critique',
        'La vue des alertes n’a rien rendu. Aucun voyant de cette grille ne peut '
        + 'être calculé : ni la quarantaine, ni les octrois, ni les comptes. '
        + 'L’absence de données n’est pas une absence de problème.');
      return { critique:1, attention:0 };
    }
    var h = '', compte = { critique:0, attention:0 };
    // ⚠️ UN COMPTE, OU « ILLISIBLE » — JAMAIS UN VERT PAR DEFAUT (lot C5, 28/09/2026).
    // `null > 0` est FAUX en JavaScript : un voyant ecrit `x > 0 ? rouge : vert`
    // passe au VERT quand la base ne rend rien. L'audit du 28/09 en a trouve
    // quatre dans cette grille (quarantaine, octrois, comptes, codes epuises).
    // Tous passent desormais par `compteLu` : ce qui n'est pas un entier >= 0
    // allume le voyant « illisible », de la couleur de l'alerte qu'il remplace.
    function compteLu(v){
      var n = (typeof v === 'number') ? v : (typeof v === 'string' && /^[0-9]+$/.test(v) ? Number(v) : NaN);
      return (isFinite(n) && n >= 0 && Math.floor(n) === n) ? n : null;
    }
    function ind(quoi, valeur, etat, detail){
      if(etat === 'critique') compte.critique++;
      else if(etat === 'attention') compte.attention++;
      return indicateur(quoi, valeur, etat, detail);
    }

    // 1. Quarantaine — de l'argent annonce que la chaine n'a pas su enregistrer.
    var quar = compteLu(a.quarantaine_non_rejouee);
    h += ind('Quarantaine non rejouée', quar === null ? 'illisible' : String(quar),
          (quar === null || quar > 0) ? 'critique' : 'ok',
          quar === null
            ? 'La base n’a pas rendu un compte. Impossible de dire si des paiements attendent : '
              + 'l’absence de chiffre n’est pas une absence de problème.'
            : (quar > 0
                ? 'Des événements de paiement attendent d’être rejoués.'
                : 'Aucun paiement en attente.'));

    // 2. L'alarme est-elle vivante ? Une alarme morte affiche du vert.
    var hAlarme = heuresDepuis(a.alarme_derniere_mesure);
    // ⚠️ LOT C5 (28/09/2026) : une date que la page ne sait pas lire donne NaN.
    // Avant, `NaN > 26` etant FAUX, le voyant passait au vert — et la bulle
    // appelait alors `quandTexte` sur cette date, ce qui faisait tomber TOUTE la
    // page (constate au banc). Et ce n'est pas « jamais » : c'est « illisible ».
    if(isNaN(hAlarme)){
      h += ind('Alarme quarantaine', 'illisible', 'critique',
            'La base a rendu une date que la page ne sait pas lire. Impossible de dire si '
            + 'l’alarme mesure encore : le « 0 » ci-contre ne prouve rien.');
    } else {
      h += ind('Alarme quarantaine', dureeTexte(hAlarme),
            hAlarme > 26 ? 'critique' : 'ok',
            hAlarme > 26
              ? 'L’alarme ne mesure plus. Le « 0 » ci-contre ne prouve rien.'
              : 'Dernière mesure : ' + quandTexte(a.alarme_derniere_mesure));
    }

    // 3. ⚠️ QUATRE VOYANTS ONT ETE RETIRES ICI. IL FAUT SAVOIR POURQUOI,
    //    SINON QUELQU'UN LES REMETTRA.
    //
    //    Le 13/09 au matin : « Webhook de paiement », « Echecs silencieux de
    //    scan » et « Archivage des mesures », tous les trois nourris par
    //    `scan_metrics`, dont la collecte est ARRETEE depuis le 12/09. Le pire
    //    des trois etait le webhook : il affichait encore « repond » sur un
    //    dernier succes date du 09/09, alors que le PREMIER paiement reel etait
    //    arrive le 12/09. Un voyant vert sur une mesure gelee.
    //
    //    Le 13/09 au soir : « Dernier evenement de facturation ». Cette grille
    //    s'appelle « ce qui doit reveiller la nuit ». Sur les dix voyants
    //    qu'elle portait, NEUF pouvaient passer a l'orange ou au rouge. Celui-la
    //    etait ecrit en dur a 'ok' et son propre texte l'avouait : « ce voyant
    //    ne passe jamais au rouge ». Il ne se lisait pas davantage : il compte
    //    aussi les annulations, les expirations, les acces offerts a 0 € et les
    //    achats de test, et avec un seul client payant « 23 heures » et
    //    « 30 jours » veulent dire la meme chose — rien. Il ne pouvait pas
    //    distinguer un webhook en panne d'une absence de vente.
    //    Un voyant qui ne peut pas alerter n'a rien a faire dans les alertes.
    //    LE FAIT N'EST PAS PERDU : il est passe sous le tableau des evenements
    //    de facturation, ou il est a sa place. Voir `rendreArgent`.
    //
    // ⚠️ LE DEMI-DEPLOIEMENT, LUI, RESTE UNE ALERTE. Entre la publication de
    // cette page et l'etape 2 du SQL, `v_admin_alertes` ne porte pas encore la
    // colonne : la grille perdait trois voyants et n'en gagnait aucun, EN
    // SILENCE. Une migration interrompue serait restee invisible pour toujours.
    if(!('dernier_evenement_facturation' in a)){
      h += ind('Migration du 13/09', 'incomplète', 'attention',
            'L’étape 2 du SQL n’a pas été appliquée : la vue des alertes ne porte pas '
            + 'encore la date du dernier événement de facturation, et les vues mortes '
            + 'sont probablement encore en place. Exécutez « 2-APRES-le-push.sql ».');
    }

    // 4. Comptes. Le reglage « inscription fermee » n'est PAS lisible en base :
    //    on mesure son EFFET a la place.
    // ⚠️ UNE VALEUR NULLE — OU UNE COLONNE ABSENTE — FAISAIT DISPARAITRE CE
    // VOYANT EN SILENCE (lot C5, 28/09/2026) : c'est celui qui dit si
    // l'inscription publique s'est rouverte. La colonne existe depuis le 09/09 ;
    // son absence ne peut plus venir que d'une vue redeployee sans elle — une panne.
    if(compteLu(a.comptes_auth) === null){
      h += ind('Comptes sur le projet', 'illisible', 'critique',
            'La base n’a pas rendu un compte. Impossible de dire si l’inscription publique '
            + 'est restée fermée.');
    } else {
      var c = compteLu(a.comptes_auth);
      h += ind('Comptes sur le projet', String(c),
            c === 1 ? 'ok' : 'critique',
            c === 1
              ? 'Le vôtre, et lui seul.'
              : 'UN COMPTE EST APPARU. L’inscription publique s’est rouverte. Dernier créé : '
                + quandTexte(a.dernier_compte_cree));
    }

    // ⚠️ AJOUTE LE 10/09 — L'ALARME QUI MANQUAIT VRAIMENT.
    // Ce qui doit reveiller la nuit, ce n'est pas un desaccord de comptage avec
    // RevenueCat : c'est qu'une personne ait saisi son code en pharmacie et
    // n'ait RIEN RECU. Cela se lit dans `attributions.etat`.
    // ⚠️ LOT C5 (28/09/2026) : les DEUX comptes doivent etre lisibles. Avant,
    // `rates` nul donnait `bloques + null` = le nombre seul, et `null > 0` faux :
    // une colonne d'echecs illisible s'affichait « aucun incident », en vert.
    // Et `bloques` nul — ou absent de la vue — faisait disparaitre le voyant,
    // sans rien dire. Les deux colonnes existent depuis le 10/09 : une colonne
    // absente est desormais « illisible », comme une colonne nulle.
    var bloques = compteLu(a.octrois_bloques), rates = compteLu(a.octrois_echoues_7j);
    if(bloques === null || rates === null){
      h += ind('Octrois de code', 'illisible', 'critique',
            'La base n’a pas rendu les deux comptes d’octrois. Impossible de dire si quelqu’un '
            + 'attend le mois offert de son code.');
    } else {
      h += ind('Octrois de code',
            (bloques + rates) > 0 ? (bloques + rates) + ' à voir' : 'aucun incident',
            bloques > 0 ? 'critique' : (rates > 0 ? 'attention' : 'ok'),
            bloques > 0
              ? bloques + ' code(s) saisi(s) il y a plus d’une heure sans accès accordé. '
                + 'Quelqu’un attend son mois offert.'
              : (rates > 0
                  ? rates + ' octroi(s) en échec sur 7 jours. La personne le sait, pas nous.'
                  : 'Tout code saisi a donné son accès.'));
    }

    // ⚠️ AJOUTE LE 23/09 — LES CODES OFFICINE ECHANGES SUR IPHONE.
    // Sur iPhone, le client echange son code CHEZ APPLE : Pilou n'en voit rien,
    // et c'est le webhook qui traduit le nom de l'offre en code pour attribuer
    // l'echange a un commercial. Deux pannes y sont SILENCIEUSES — le client,
    // lui, a bien ses trois mois, donc personne ne se plaindra :
    //   - `offres_apple_inconnues` : des NOMS d'offre absents de `offres_apple`
    //     (offre creee sans sa ligne, ou table videe par une restauration) ;
    //   - `officine_ios_non_attribuees` : des CLIENTS dont le nom d'offre est
    //     connu mais sans attribution `accorde`. Il NE S'ETEINT PAS SEUL : le
    //     webhook repond 200 quoi qu'il arrive, RevenueCat ne rejoue rien. Le
    //     rattrapage est manuel.
    //   Une attribution par client (`attributions_app_user_id_key`) : le
    //   premier code gagne. Un client deja servi n'est donc pas un ecart.
    // ORANGE ET NON ROUGE : aucun client n'attend, et rien n'est perdu pour de
    // bon (rattrapable pendant 23 mois). C'est la commission qui est en jeu.
    // ⚠️ LES DEUX COLONNES, PAS UNE (revue adverse du 23/09) : tester la seule
    // seconde laissait la premiere, absente, valoir 0 — un FAUX VERT. Et une
    // valeur qui n'est pas un compte (null, negatif, texte) n'est jamais lue
    // comme un zero : elle rend le voyant « illisible ».
    // ⚠️ LE DEMI-DEPLOIEMENT SE VOIT, comme le 13/09 : sans les colonnes, la
    // grille perdrait ce voyant EN SILENCE.
    // (`compteLu` est definie en tete de `rendreAlertes` : elle sert a tous les voyants.)
    if(!('offres_apple_inconnues' in a) || !('officine_ios_non_attribuees' in a)){
      h += ind('Migration du 23/09', 'incomplète', 'attention',
            'La vue des alertes ne porte pas les deux compteurs des codes officine sur iPhone '
            + '(migration « 20260923180000_offres_apple.sql »). Un code échangé chez Apple pourrait '
            + 'n’être attribué à aucun commercial sans que rien ne le dise.');
    } else {
      var inconnues = compteLu(a.offres_apple_inconnues),
          nonAttr = compteLu(a.officine_ios_non_attribuees);
      if(inconnues === null || nonAttr === null){
        h += ind('Codes officine sur iPhone', 'illisible', 'attention',
              'La base a rendu une valeur qui n’est pas un compte. Impossible de dire si des '
              + 'échanges iPhone ont échappé aux commerciaux.');
      } else {
        h += ind('Codes officine sur iPhone',
              inconnues > 0 ? inconnues + (inconnues > 1 ? ' offres inconnues' : ' offre inconnue')
                : (nonAttr > 0
                    ? nonAttr + (nonAttr > 1 ? ' échanges non attribués' : ' échange non attribué')
                    : 'aucun écart'),
              (inconnues > 0 || nonAttr > 0) ? 'attention' : 'ok',
              (inconnues > 0
                ? (inconnues > 1
                    ? inconnues + ' noms d’offre Apple sont inconnus en base : des offres ont été '
                      + 'créées dans App Store Connect sans leur ligne dans la table des offres, '
                    : 'Un nom d’offre Apple est inconnu en base : une offre a été créée dans '
                      + 'App Store Connect sans sa ligne dans la table des offres, ')
                  + 'ou la table a été vidée par une restauration. Leurs échanges ne sont attribués à '
                  + 'aucun commercial. Ajouter la ligne ne suffit pas pour les échanges déjà reçus : '
                  + 'ils passeront en « non attribués » et devront être rattrapés. '
                : '')
              + (nonAttr > 0
                ? (nonAttr > 1
                    ? nonAttr + ' clients iPhone ont échangé un code officine sans que leur échange soit'
                    : 'Un client iPhone a échangé un code officine sans que son échange soit')
                  + ' attribué à un commercial. '
                  + (nonAttr > 1 ? 'Les clients ont bien leurs trois mois' : 'Le client a bien ses trois mois')
                  + ' ; c’est la commission qui manque. Ce voyant ne s’éteint pas seul : rattrapage manuel (procédure « '
                  + 'Rattrapage officine iPhone » du dossier du projet).'
                : (inconnues > 0 ? ''
                    : 'Aucun écart : chaque échange iPhone reçu sous un nom d’offre officine connu est '
                      + 'attribué à un commercial (les 5 dernières minutes ne sont pas encore comptées).')));
      }
    }

    // 5. Information, pas alerte.
    var epuises = compteLu(a.codes_epuises);
    h += ind('Codes à quota épuisé', epuises === null ? 'illisible' : String(epuises),
          (epuises === null || epuises > 0) ? 'attention' : 'ok',
          epuises === null
            ? 'La base n’a pas rendu un compte. Impossible de dire si des codes sont bloqués.'
            : (epuises > 0 ? 'Ces codes ne donnent plus rien en pharmacie.' : 'Aucun code bloqué.'));


    // ⚠️ LE VOYANT « SAUVEGARDE » A ETE RETIRE ICI, POUR LA MEME RAISON QUE
    // CELUI DE LA COLLECTE. La bande « À faire » du haut porte deja le compte a
    // rebours, sa couleur et le bouton. Le detail chiffre de la derniere
    // sauvegarde — date, lignes, octets, empreinte — n'est pas perdu : il est
    // dans le tableau de la section Sauvegarde.
    //
    // ⚠️ SON ETAT COMPTE TOUJOURS, MAIS PAS ICI : voir la note de la collecte
    // quelques lignes plus bas. C'est `rendreAFaire` qui le compte.

    // ⚠️ AJOUTE LE 11/09 — LE VOYANT QUI VOIT VENIR UNE PERTE DEFINITIVE.
    // L'archivage est MANUEL. Au-dela de 32 jours d'age, l'API rend 0 au lieu
    // d'une absence : un jour non collecte a temps n'est pas « en retard », il
    // est PERDU. Sans ce voyant, un dispositif abandonne depuis six semaines
    // afficherait « dernier etat : ok » — vert, sur une perte en cours.
    // 🔴 DEFAUT TROUVE AU BANC LE 11/09 : quand la vue d'etat rend ZERO ligne,
    // les voyants d'audience DISPARAISSAIENT de la grille et le bandeau affichait
    // « Rien a signaler ». Le meme mode de panne que celui du 09/09, deplace d'un
    // cran : l'absence de donnees n'est pas une absence de probleme.
    // ⚠️ LE VOYANT « COLLECTE D'AUDIENCE » A ETE RETIRE ICI (13/09/2026, soir).
    //
    // Remarque de Gaetan, et elle est juste : depuis que la bande « À faire »
    // porte le compte a rebours ET sa couleur, en haut de page, ce voyant
    // affichait le MEME nombre, plus bas, dans une grille de dix. Le meme
    // chiffre deux fois n'aide personne a decider.
    //
    // ⚠️ SON ETAT COMPTE TOUJOURS, MAIS PAS ICI. Il est compte par `rendreAFaire`,
    // qui rend ses propres totaux : le bandeau du haut additionne les deux, et
    // sa PHRASE dit dans lequel des deux endroits regarder. Compter une echeance
    // dans le total de la grille faisait annoncer « 1 alerte rouge, regardez les
    // voyants ci-dessous » au-dessus d'une grille ou aucun voyant n'est rouge.
    // Releve en revue le 13/09 au soir.

    if(au && au.etat){
      // Le retard ne suffit pas : une serie peut cesser d'etre rendue par l'API
      // alors que le passage se termine en « ok ». Le trou, lui, se voit.
      var trous = 0, retard = 0, incoh = 0, iM;
      if(au.mesures){
        for(iM = 0; iM < au.mesures.length; iM++){
          var mM = au.mesures[iM];
          if(mM.jours_manquants != null && Number(mM.jours_manquants) > trous)
            trous = Number(mM.jours_manquants);
          if(mM.jours_de_retard != null && Number(mM.jours_de_retard) > retard)
            retard = Number(mM.jours_de_retard);
          if(mM.forme === 'INCOHERENT') incoh++;
        }
      }
      // ⚠️ LE RETARD FAIT MONTER L'ETAT (corrige en revue le 13/09). `retard`
      // etait calcule puis seulement IMPRIME : une serie trente jours en retard
      // laissait le voyant vert sur « sans trou », et le seul nombre qui disait
      // la verite partait dans une infobulle qu'il faut survoler.
      var etCont = (trous > 0 || incoh > 0 || retard >= 8) ? 'attention' : 'ok';
      if(trous >= 28 || retard >= 28) etCont = 'critique';
      h += ind('Continuit\u00e9 de l\u2019archive',
            trous > 0 ? trous + ' j manquant(s)'
                      : (retard >= 8 ? retard + ' j de retard' : 'sans trou'),
            etCont,
            (trous > 0
              ? 'Une s\u00e9rie au moins a ' + trous + ' jour(s) jamais collect\u00e9(s). '
                + 'Au-del\u00e0 de 32 jours ils ne se rattrapent plus. '
              : 'Chaque s\u00e9rie quotidienne couvre tous ses jours. ')
            + (incoh > 0 ? incoh + ' mesure(s) ont chang\u00e9 de forme. ' : '')
            + 'S\u00e9rie la plus en retard : ' + retard + ' jour(s).');
    }

    // 🔴 SECOND DEFAUT DU BANC : le tableau jour par jour se refusait a
    // s'afficher — comportement voulu — mais le bandeau restait VERT. Un refus
    // d'affichage est un incident : il doit s'allumer.
    // Orange et non rouge : un simple renommage cosmetique par RevenueCat ne
    // doit pas laisser un voyant rouge allume pendant des semaines. Un voyant
    // rouge permanent est un voyant eteint.
    if(au && au.mesures && au.mesures.length && !audienceLibellesConformes(au.mesures)){
      h += ind('Libell\u00e9s d\u2019audience', 'chang\u00e9s', 'attention',
            'Une des trois s\u00e9ries suivies ne porte plus le libell\u00e9 attendu. Le tableau '
            + 'jour par jour n\u2019est PAS affich\u00e9 : ses colonnes pourraient d\u00e9signer '
            + 'autre chose. \u00c0 v\u00e9rifier avant de le r\u00e9tablir.');
    }

    // Lot vert 1 (21/09/2026) : le scan revient dans la grille, nourri cette
    // fois par un compteur VIVANT (le voyant retire le 13/09 lisait une table
    // figee). Voir `voyantScan`.
    var vs = voyantScan(au && au.scan, au && au.resume);
    if(vs) h += ind(vs.quoi, vs.valeur, vs.etat, vs.detail);

    $('grille-alertes').innerHTML = h;
    return compte;
  }

  window.PilouAlertes = { rendre: rendreAlertes };
})();
