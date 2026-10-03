/* ============================================================================
 * PILOU — TABLEAU DE BORD (console V4) — CONNEXION ET LECTURE DES VUES
 * ============================================================================
 * MÊME SESSION que la console détaillée : même adresse, même clé publique, même
 * clé de stockage (`sb-kxjgzyhbefucxdgjraju-auth-token`, celle que la
 * bibliothèque déduit de l'adresse). Sans session : renvoi vers index.html, qui
 * porte l'écran de connexion. Cette page N'ÉCRIT RIEN : aucune fonction, aucun
 * `rpc`, aucun appel de fonction serveur — seulement des `select`.
 * Garde-fous repris de index.html (`charger`, l. 1483-1548) :
 *  - le témoin `v_admin_ping` d'abord : vide = « console fermée », rien d'autre ;
 *  - une vue en erreur = « lecture impossible », aucun chiffre ;
 *  - une vue non paginée qui rend 1 000 lignes = liste coupée = lecture impossible ;
 *  - `v_admin_mesure` et `v_admin_mesure_charge` lues EN ENTIER par lecture.js ;
 *  - un jeton : toute réponse qui n'est pas la plus récente est jetée.
 * ES5 strict. Expose `TDDonnees`.
 * ========================================================================== */
(function(racine){
  'use strict';

  var URL_PROJET = 'https://kxjgzyhbefucxdgjraju.supabase.co';
  // Clé PUBLIQUE (rôle `anon`), la même que index.html : elle n'ouvre rien seule.
  var CLE_PUBLIQUE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4amd6eWhiZWZ1Y3hkZ2pyYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTMxMDUsImV4cCI6MjA5ODIyOTEwNX0.y7K3jYREwyVCg4UuSDy9-d3opHHtGfA4oeWvZ3UjwEU';

  // Les vues lues, par NOM (jamais par position — leçon du 13/09 dans index.html).
  // `pages` : lecture complète par lecture.js, dans cet ordre (clé primaire).
  var VUES = [
    { cle:'resume',       vue:'v_admin_resume',              unique:true },
    { cle:'audJours',     vue:'v_admin_audience_jours',      ordre:{ col:'jour', asc:false } },
    { cle:'audMesures',   vue:'v_admin_audience_mesures',    ordre:{ col:'graphique', asc:true } },
    { cle:'scan',         vue:'v_admin_scan',                ordre:{ col:'jour', asc:false } },
    { cle:'mesure',       vue:'v_admin_mesure',              ordre:{ col:'semaine', asc:false },
      pages:['semaine','cle','plateforme','version','anciennete','test'] },
    { cle:'mesureCharge', vue:'v_admin_mesure_charge',       ordre:{ col:'semaine', asc:false },
      pages:['semaine','cle','plateforme','version','anciennete','test','charge'], facultative:true },
    { cle:'netJour',      vue:'v_admin_net_jour',            ordre:{ col:'jour', asc:false } },
    { cle:'attendus',     vue:'v_admin_paiements_attendus',  unique:true },
    { cle:'cohorte',      vue:'v_admin_apporteurs_cohorte' },
    // V4.1 : heure de la dernière collecte (bandeau « En direct », « Actualiser »).
    { cle:'audEtat',      vue:'v_admin_audience_etat',       unique:true }
  ];

  var sb = null, jeton = 0;
  function client(){
    if(!sb) sb = racine.supabase.createClient(URL_PROJET, CLE_PUBLIQUE, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    return sb;
  }
  function lire(vue, ordre){
    var q = client().from(vue).select('*');
    if(ordre) q = q.order(ordre.col, { ascending: !!ordre.asc });
    return q;
  }

  // Rend une promesse de : { etat:'sans-session' } | { etat:'fermee' }
  //   | { etat:'erreur', message } | { etat:'ok', d } | null (réponse périmée).
  function charger(){
    var moi = ++jeton;
    if(!racine.supabase || !racine.supabase.createClient)
      return Promise.resolve({ etat:'bibliotheque' });
    return client().auth.getSession().then(function(s){
      if(moi !== jeton) return null;
      if(!(s && s.data && s.data.session)) return { etat:'sans-session' };
      return lire('v_admin_ping').then(function(r){
        if(moi !== jeton) return null;
        if(r.error) throw r.error;
        if(!r.data || !r.data.length) return { etat:'fermee' };
        return Promise.all(VUES.map(function(v){
          return (v.pages && racine.PilouLecture)
            ? racine.PilouLecture.toutes(client(), v.vue, v.pages) : lire(v.vue, v.ordre);
        })).then(function(res){
          if(moi !== jeton) return null;
          var d = {};
          for(var i = 0; i < res.length; i++){
            var v = VUES[i], data = res[i].data || [];
            // Vue FACULTATIVE (lue par cette seule page) : son échec ne met en
            // « non lu » que le bloc qui s'en sert, jamais toute la page.
            if(res[i].error && v.facultative){ d[v.cle] = { erreur: res[i].error.message || String(res[i].error) }; continue; }
            if(res[i].error) throw res[i].error;
            // ⚠️ JAMAIS UNE LISTE COUPÉE EN SILENCE : le serveur rend 1 000 lignes
            // au plus. Les vues paginées sont gardées par leur agrégation
            // (`lectureComplete`), comme dans index.html.
            if(!v.unique && !v.pages && data.length >= 1000)
              throw { message: v.vue + ' a rendu 1 000 lignes : la liste est probablement coupée' };
            d[v.cle] = v.unique ? (data[0] || null) : data;
          }
          return { etat:'ok', d:d };
        });
      });
    }).catch(function(e){
      if(moi !== jeton) return null;
      return { etat:'erreur', message: (e && e.message) ? e.message : String(e) };
    });
  }

  racine.TDDonnees = { charger:charger, VUES:VUES, URL_PROJET:URL_PROJET };
})(typeof window !== 'undefined' ? window : this);
