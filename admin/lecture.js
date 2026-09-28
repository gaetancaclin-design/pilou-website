/* ============================================================================
 * CONSOLE PILOU — LECTURE COMPLÈTE D'UNE VUE, PAGE PAR PAGE (lot V1, 28/09/2026)
 * ============================================================================
 * Le serveur de la base (PostgREST) rend au plus 1 000 lignes par réponse et
 * COUPE EN SILENCE au-delà. `v_admin_mesure` (26 semaines de cases) dépassera
 * ce plafond dans quelques mois : la page s'éteignait alors d'elle-même
 * (garde « liste probablement tronquée »), et plus tôt encore avec les
 * compteurs de la 1.4.22.
 *
 * Ce fichier lit TOUTE la vue, par pages, sans rien changer aux calculs de la
 * page : elle reçoit exactement les mêmes lignes, seulement toutes.
 *
 * ⚠️ TROIS GARDES, PARCE QU'UNE LECTURE EN PLUSIEURS FOIS PEUT MENTIR :
 *  1. L'ORDRE EST TOTAL ET STABLE : la clé primaire complète de la table, par
 *     semaine CROISSANTE. Les semaines closes ne changent plus ; les lignes
 *     nouvelles n'arrivent qu'en fin de liste (semaine en cours). Aucune page
 *     déjà lue ne peut donc glisser.
 *  2. LE NOMBRE TOTAL EST DEMANDÉ À CHAQUE PAGE (`count: 'exact'`). S'il change
 *     en cours de lecture (une semaine qui sort de la fenêtre à minuit UTC le
 *     lundi, un envoi qui crée une case), la lecture est RECOMMENCÉE une fois,
 *     puis refusée : jamais un assemblage de deux états différents.
 *  3. ON S'ARRÊTE SUR LE COMPTE, PAS SUR UNE PAGE COURTE : si le serveur
 *     plafonnait plus bas que la taille demandée, une page « courte » ferait
 *     croire à la fin ; chaque page repart de ce qui a été REÇU. Une page vide
 *     avant d'avoir tout reçu = relecture. Et aucune clé en double à l'arrivée.
 *
 * CAS RÉSIDUEL, ÉCRIT POUR NE PAS ÊTRE OUBLIÉ : si, entre deux pages, AUTANT de
 * lignes sortaient en tête qu'il en entre en fin, le total resterait le même et
 * une ligne pourrait être sautée sans doublon. Pour `v_admin_mesure`, c'est
 * hors d'atteinte : les lignes n'entrent que dans la semaine en cours (écrite
 * par `mesure_ajouter` et `mesure_rejet`), et n'en sortent qu'au lundi 00:00 UTC, par semaine
 * ENTIÈRE, au moment même où la nouvelle semaine commence vide. En pratique, une
 * lecture à cheval sur lundi 00:00 UTC donne au pire « rechargez », jamais un
 * chiffre faux.
 *
 * VÉRIFIÉ EN PRODUCTION LE 28/09 (table publique de la base des médicaments) :
 * le serveur rend 1 000 lignes au plus même si on en demande 5 000, et il
 * expose `Content-Range` (avec le total) à l'origine pilou-app.fr.
 *
 * ES5 strict, aucune dépendance. N'expose qu'un objet : `window.PilouLecture`.
 * Rend une promesse de { data, error } — la même forme qu'une lecture simple.
 * Le tableau rendu porte `lectureComplete = true` : c'est ce qui autorise la
 * page à dépasser 1 000 lignes sans crier à la troncature.
 * ========================================================================== */
(function(){
  'use strict';

  var TAILLE_PAGE = 1000;   // jamais plus que le plafond du serveur
  var PAGES_MAX = 50;       // 50 000 lignes : au-delà, quelque chose ne va pas

  function unePasse(sb, vue, ordre){
    var lignes = [], total = null, page = 0;
    function suivante(){
      var q = sb.from(vue).select('*', { count: 'exact' });
      for(var i = 0; i < ordre.length; i++) q = q.order(ordre[i], { ascending: true });
      // On repart de ce qu'on a REÇU, pas de ce qu'on a demandé : si le serveur
      // plafonne plus bas que TAILLE_PAGE, aucune ligne n'est sautée.
      var debut = lignes.length;
      return q.range(debut, debut + TAILLE_PAGE - 1).then(function(r){
        if(r.error) return { error: r.error };
        if(typeof r.count !== 'number' || !isFinite(r.count) || r.count < 0)
          return { error: { message: vue + ' : le nombre total de lignes n’a pas été rendu' } };
        if(total === null) total = r.count;
        else if(r.count !== total) return { instable: true };
        var data = r.data || [];
        for(var j = 0; j < data.length; j++) lignes.push(data[j]);
        if(lignes.length > total) return { instable: true };
        if(lignes.length === total){
          // Dernière garde : aucune clé en double. Une ligne sortie en tête de
          // fenêtre pendant qu'une autre entrait en fin laisserait le total
          // inchangé mais DÉCALERAIT les pages : une ligne lue deux fois, une
          // autre jamais. La clé primaire en double le trahit.
          var vues = {};
          for(var k = 0; k < lignes.length; k++){
            var cle = '';
            for(var c = 0; c < ordre.length; c++) cle += '\u0001' + String(lignes[k][ordre[c]]);
            if(vues[cle]) return { instable: true };
            vues[cle] = true;
          }
          lignes.lectureComplete = true;
          return { data: lignes, error: null };
        }
        if(!data.length) return { instable: true };
        page++;
        if(page >= PAGES_MAX)
          return { error: { message: vue + ' : plus de ' + (PAGES_MAX * TAILLE_PAGE) + ' lignes, lecture arrêtée' } };
        return suivante();
      });
    }
    return suivante();
  }

  // Une passe ; si la vue a bougé pendant la lecture, une seconde ; sinon, refus.
  function toutes(sb, vue, ordre){
    return unePasse(sb, vue, ordre).then(function(r){
      if(!r.instable) return r;
      return unePasse(sb, vue, ordre).then(function(r2){
        if(!r2.instable) return r2;
        return { error: { message: vue + ' : la vue a changé deux fois pendant la lecture. Rechargez.' } };
      });
    });
  }

  window.PilouLecture = { toutes: toutes, TAILLE_PAGE: TAILLE_PAGE };
})();
