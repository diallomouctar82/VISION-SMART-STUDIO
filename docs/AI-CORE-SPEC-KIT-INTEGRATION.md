# Raccordement Studio → AI Core — conversation pilotée

## Principe

Vision Smart Studio **ne crée pas de logique parallèle**. Le navigateur n'appelle aucun fournisseur de modèle et ne porte aucun secret. Studio est l'adaptateur d'expérience ; Vision Smart AI Core possède la logique, l'état de conversation et le raccordement modèle.

## Point d'entrée navigateur

Le navigateur parle uniquement au proxy serveur same-origin de Studio :

- `POST /api/ai-core/specification-sessions` pour le premier tour ;
- `POST /api/ai-core/specification-sessions/{session_id}/messages` pour les tours suivants.

Le proxy autorise uniquement ces deux formes de route et ajoute côté serveur un jeton de pont dédié à Studio. Ce jeton ne donne accès qu'au chemin de conversation ; il ne s'agit pas du JWT général de l'API mémoire.

## Configuration serveur Studio

Variables **serveur uniquement** :

- `AI_CORE_URL` — défaut `https://ai-core.moknet.net` ;
- `STUDIO_BRIDGE_TOKEN` — jeton aléatoire dédié au pont Studio → AI Core.

`STUDIO_BRIDGE_TOKEN` ne doit jamais être préfixé par `NEXT_PUBLIC_`, écrit dans le dépôt, renvoyé au navigateur ni journalisé. AI Core ne versionne que son empreinte SHA-256.

## Contrat AI Core

AI Core expose :

- `POST /v1/specification-sessions` ;
- `POST /v1/specification-sessions/{session_id}/messages`.

Le premier appel renvoie `session_id` + `session_token`. Studio conserve ces deux valeurs en mémoire pour la conversation active et les présente au tour suivant. Le `session_token` est signé par AI Core : le navigateur peut le transporter, mais ne peut pas modifier l'historique, le contexte projet ou le propriétaire sans invalider la signature.

Une seule session est donc utilisée sur plusieurs tours. Changer de projet réinitialise le dialogue Studio et démarre une nouvelle session.

## Texte et voix

Texte et transcription vocale convergent vers le même chemin canonique :

`texte ou voix transcrite → intent/message → AI Core → même session → réponse`.

La reconnaissance vocale du navigateur ne constitue pas un deuxième moteur conversationnel : elle ne fait que remplir le même champ d'entrée.

## Comportement en panne

Studio ne simule jamais une réponse. Si :

- le jeton de pont manque ;
- AI Core est indisponible ;
- aucun modèle conversationnel autorisé n'est actif ;
- la session a expiré ;

l'interface affiche un blocage explicite. Une session expirée est abandonnée ; le prochain envoi peut démarrer une nouvelle conversation.

## Modèle / RunPod

Le choix du fournisseur et du modèle est une responsabilité AI Core, pas Studio. Aucun identifiant d'endpoint ni clé RunPod ne doit être nécessaire côté navigateur.

L'activation d'une capacité GPU payante reste un acte séparé soumis à la gouvernance de dépense et ne doit jamais être déclenchée implicitement par le déploiement de Studio.

## Vérification

Avant toute fusion :

```bash
npm run test:spec-kit-contract
npm run typecheck
npm run lint
npm run build
```

Le contrat vérifie notamment :

- authentification AI Core uniquement côté serveur ;
- absence de `NEXT_PUBLIC_AI_CORE_*` ;
- premier tour + continuation réelle via `continueSpecificationSession` ;
- conservation de `sessionToken` ;
- texte et voix sur le même contrat ;
- absence de moteur conversationnel local.

La validation bout-en-bout exige ensuite **au moins trois tours réels** sur la même session AI Core et une preuve que le modèle a bien reçu le contexte des tours antérieurs. Des doubles de test ne valent pas preuve d'inférence réelle.

## Rollback

Revenir sur cette PR retire le proxy, le client multi-tours et son branchement visuel. Aucune migration de données n'est créée dans Studio. Le retrait de Studio ne modifie ni la mémoire canonique ni les politiques AI Core.
