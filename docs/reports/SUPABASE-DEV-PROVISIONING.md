# Vision Smart Studio — Provisionnement Supabase de développement

> Rapport de preuve non normatif, daté du 1er septembre 2026. Le modèle durable reste défini par `docs/DATA-MODEL.md`, l'ordre des capacités par `docs/ROADMAP.md` et les exigences de sécurité par `SECURITY.md`.

## Résultat

Un projet Supabase PostgreSQL isolé a été créé après autorisation explicite du coût mensuel. Il prépare un environnement de développement pour les futures capacités de persistance et de connecteur sans modifier le périmètre fonctionnel de la Phase 1.

| Propriété | Valeur |
|---|---|
| Projet | `vision-smart-studio-dev` |
| Référence | `nnmlscwfnkhfmxpjecst` |
| Organisation | `diallomouctar82's Org` |
| Région | `eu-west-1` |
| État vérifié | `ACTIVE_HEALTHY` |
| API | `https://nnmlscwfnkhfmxpjecst.supabase.co` |
| Moteur | PostgreSQL 17 |
| Version vérifiée | 17.6 |
| Coût autorisé | 10 USD par mois |

## Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| Connexion SQL | Réussie avec `current_database()`, `current_user`, version serveur et horodatage |
| Tables applicatives dans `public` | 0 |
| Migrations applicatives | 0 |
| Avis sécurité Supabase | 0 |
| Avis performance Supabase | 1 information non bloquante sur l'allocation absolue des connexions Auth |
| Secret ajouté au dépôt ou au navigateur | Aucun |

L'avis Auth est acceptable pour un projet de développement vide. Il devra être réévalué avant montée en charge ou promotion vers un environnement de production.

## Limites volontaires

- aucune table métier n'a été inventée ou créée;
- aucune migration SQL n'a été appliquée;
- aucune clé publique ou secrète n'a été copiée dans Git;
- aucune variable Netlify n'a été créée;
- aucune dépendance Supabase n'a été ajoutée à l'application;
- aucun accès anonyme ou authentifié aux données métier n'existe;
- le repository `localStorage` de Phase 1 reste l'adaptateur actif.

Le référentiel définit les concepts durables et place l'intégration Supabase dans le cadre futur des connecteurs, mais il ne fixe pas encore le schéma SQL, les cardinalités, les rôles ni les politiques RLS. Ces décisions doivent être documentées avant une migration applicative.

## Gate avant création du schéma

La prochaine évolution Supabase doit, dans cet ordre :

1. préciser si Supabase est le backend interne du Studio, un connecteur de projets clients, ou les deux avec isolation stricte;
2. figer le schéma relationnel, les identifiants, cardinalités, contraintes et règles de suppression;
3. définir Auth, workspaces, memberships, rôles et matrice d'autorisations;
4. écrire des migrations versionnées et rejouables;
5. activer RLS sur chaque table exposée et associer explicitement grants et policies;
6. tester les chemins anonyme, authentifié, inter-tenant, rôle métier et backend privilégié;
7. exécuter les advisors sécurité/performance et documenter le retour arrière;
8. intégrer ensuite l'adaptateur applicatif sans exposer de clé secrète au frontend.

## Retour arrière

Aucune donnée applicative n'existe. Le projet peut être suspendu ou supprimé depuis Supabase si la décision d'architecture change, mais une suppression est destructive et nécessite une autorisation distincte.
