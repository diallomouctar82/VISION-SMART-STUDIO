# Vision Smart Studio — Provisionnement Supabase de développement

> **Rapport historique remplacé.** Ce document conserve l'état initial vérifié le 1er septembre 2026, avant la création du schéma administratif. Il ne décrit plus l'état courant de la base ni de l'application. L'état actuel est défini par [`ADMIN-CONTROL-PLANE.md`](../ADMIN-CONTROL-PLANE.md), son guide [`ADMIN-OPERATIONS.md`](../ADMIN-OPERATIONS.md), les migrations versionnées sous `supabase/migrations/` et le rapport de livraison [`PROJECT-SETUP-DELIVERY.md`](PROJECT-SETUP-DELIVERY.md). Le modèle durable reste défini par [`DATA-MODEL.md`](../DATA-MODEL.md).

## Résultat historique

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

## Vérifications effectuées le 1er septembre 2026

| Contrôle | Résultat |
|---|---|
| Connexion SQL | Réussie avec `current_database()`, `current_user`, version serveur et horodatage |
| Tables applicatives dans `public` | 0 |
| Migrations applicatives | 0 |
| Avis sécurité Supabase | 0 |
| Avis performance Supabase | 1 information non bloquante sur l'allocation absolue des connexions Auth |
| Secret ajouté au dépôt ou au navigateur | Aucun |

L'avis Auth était acceptable pour le projet de développement encore vide à cette date. Cette conclusion ne vaut pas validation du schéma administratif ajouté ensuite : les advisors, permissions négatives, migrations appliquées et fonctions déployées doivent être vérifiés comme des preuves courantes distinctes.

## Limites volontaires à cette date

- aucune table métier n'a été inventée ou créée;
- aucune migration SQL n'a été appliquée;
- aucune clé publique ou secrète n'a été copiée dans Git;
- aucune variable Netlify n'a été créée;
- aucune dépendance Supabase n'a été ajoutée à l'application;
- aucun accès anonyme ou authentifié aux données métier n'existe;
- le repository `localStorage` de Phase 1 reste l'adaptateur actif.

Ces constats décrivent uniquement le point de départ. Le lot administratif ultérieur a documenté puis versionné son propre schéma SQL, ses cardinalités, ses rôles et ses politiques RLS. Il ne migre pas pour autant les snapshots Project/Mission/Task de Phase 1, qui restent dans le navigateur.

## Gate historique avant création du schéma

L'évolution administrative ultérieure devait, dans cet ordre :

1. préciser si Supabase est le backend interne du Studio, un connecteur de projets clients, ou les deux avec isolation stricte;
2. figer le schéma relationnel, les identifiants, cardinalités, contraintes et règles de suppression;
3. définir Auth, workspaces, memberships, rôles et matrice d'autorisations;
4. écrire des migrations versionnées et rejouables;
5. activer RLS sur chaque table exposée et associer explicitement grants et policies;
6. tester les chemins anonyme, authentifié, inter-tenant, rôle métier et backend privilégié;
7. exécuter les advisors sécurité/performance et documenter le retour arrière;
8. intégrer ensuite l'adaptateur applicatif sans exposer de clé secrète au frontend.

Cette liste est conservée comme trace de la décision initiale, pas comme une liste de travaux encore non commencés. La présence des migrations dans Git prouve leur versionnement ; elle ne remplace pas les preuves d'application distante, d'advisors et de tests de permissions exigées pour la clôture.

## Retour arrière au point initial

Au moment de ce contrôle initial, aucune donnée applicative n'existait et le projet pouvait être suspendu ou supprimé sans migration métier. Cette option historique n'est plus une procédure de retour arrière valable après création du plan de contrôle. Le retour arrière courant doit suivre `ADMIN-OPERATIONS.md`, préserver l'audit et utiliser des migrations correctives vers l'avant.
