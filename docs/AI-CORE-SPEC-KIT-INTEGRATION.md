# Raccordement Studio → AI Core — spécification pilotée

## Point d’entrée

Vision Smart Studio consomme exclusivement la compétence AI Core `spec-kit-intent-to-convergence` via :

- `POST /v1/specification-sessions` pour l’intention initiale ;
- `POST /v1/specification-sessions/{session_id}/messages` pour la conversation continue.

Configurer `NEXT_PUBLIC_AI_CORE_URL` vers l’API AI Core autorisée. Aucun secret ne doit être placé dans cette variable publique.

## Parcours

Texte ou voix transcrite → même champ `intent` → contexte projet déjà connu → AI Core → éventuelle question strictement nécessaire → validation de l’intention → plan → tâches → exécution → convergence.

Studio affiche l’état renvoyé et ne crée pas de logique parallèle. Sans endpoint, il affiche un blocage explicite et ne simule pas une réponse.

## Vérification

`npm run test:spec-kit-contract`, puis `npm run typecheck`, `npm run lint` et `npm run build`.

Cas couverts : intention claire, ambiguïté matérialisée par `NEEDS_CLARIFICATION`, entrée vocale et conservation du même contrat, absence de moteur Spec Kit local.

## Rollback

Revenir sur la PR, retirer `lib/ai-core-specification.ts` et le branchement de `StudioWorkspace`. Aucune migration ni donnée distante n’est créée par cette intégration.
