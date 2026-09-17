# Mission Cockpit — alignement feuille de route

**Date :** 2026-09-17  
**Portée :** Vision Smart Studio  
**Base :** `feat/ai-core-spec-kit-integration` / PR #2  
**Principe :** la Mission pilote l’interface ; l’interface ne redéfinit ni AI Core ni la Mission.

## 1. Position architecturale

Vision Smart Studio est l’application de création et de pilotage humain. Vision Smart AI Core reste le centre commun de gouvernance, mémoire, sécurité, orchestration, modèles et agents pour l’ensemble des applications Vision Smart.

Le Studio ne crée donc :

- ni second orchestrateur général ;
- ni mémoire institutionnelle parallèle ;
- ni coffre de secrets parallèle ;
- ni moteur conversationnel concurrent ;
- ni progression fictive indépendante des tâches/checkpoints réels.

## 2. Dépendances déjà existantes

Cette évolution prolonge, elle ne remplace pas :

- la PR Studio #2 : dialogue texte + transcription vocale vers AI Core, proxy serveur, continuité multi-tours ;
- la PR AI Core #103 : sessions de spécification gouvernées et état conversationnel canonique ;
- la PR AI Core #106 : adaptateur Qwen local/RunPod et preuve AgentRuntime → RunPod Qwen ;
- `docs/ROADMAP.md` : progression officielle des capacités Studio.

Les travaux restent empilés tant que leurs bases ne sont pas fusionnées. Aucun composant n’est copié pour contourner cette dépendance.

## 3. Cockpit Mission

Le panneau Mission doit rendre visibles quatre états sans créer une seconde source de vérité :

1. **Mission active** — au moins une tâche réellement `in_progress` ;
2. **Missions inachevées** — état partiel, bloqué ou interrompu sans tâche active ;
3. **Missions prévues** — toutes les tâches sont encore à faire à 0 % ;
4. **Missions terminées** — toutes les tâches sont `done` à 100 %.

Ces états sont dérivés de `StudioMission.tasks`. Ils ne sont pas saisis manuellement. La sélection d’une mission change le contexte affiché et le contexte envoyé au dialogue, mais ne modifie pas sa progression.

L’ancien bouton `Avancer +25%` est supprimé : une interface utilisateur ne doit jamais fabriquer la preuve d’avancement d’une mission.

## 4. Les trois zones de la feuille de route

### Zone gauche — Applications / projets

- liste des applications/projets ;
- création/sélection ;
- rappel visible qu’AI Core est central ;
- résumé des capacités Studio par phase.

### Zone centrale — Dialogue / Preview / Feuille de route

- **Dialogue** : texte réellement raccordé au chemin multi-tours AI Core de la PR #2 ;
- **Voix navigateur** : transcription actuelle, envoyée sur le même chemin que le texte ;
- **Vision et Fichiers** : visibles comme capacités Phase 5 mais désactivées tant qu’un transport gouverné réel n’existe pas ;
- **Preview** : surface réelle du produit, mais aucun résultat distant n’est simulé ; tant qu’aucune preview certifiée n’est fournie, l’état reste explicitement « non raccordé » ;
- **Feuille de route** : phases 1 à 10 visibles sans les présenter comme terminées.

### Zone droite — Mission et progression

- progression projet calculée depuis les missions/tâches ;
- lanes Active / Inachevées / Prévues / Terminées ;
- détail d’une mission sélectionnée ;
- tâches et progression en lecture d’état ;
- rappel des futurs domaines Bugs, Agents/Modèles, Sécurité et Déploiements sans faux bouton actif.

## 5. Correspondance avec `docs/ROADMAP.md`

| Roadmap | Expression dans le cockpit | État de ce changement |
|---|---|---|
| Phase 1 — Visual Workspace | trois zones, projets, mission/tâches, progression | renforcé |
| Phase 2 — Discovery | conversation persistante, mission ciblée | réutilise PR #2 / AI Core #103 |
| Phase 3 — Model Gateway | backend/modèle observé depuis la session | affichage seulement ; routage reste AI Core |
| Phase 4 — Model Manager | futur panneau agents & modèles | non raccordé |
| Phase 5 — Voice & Multimodal | voix navigateur + emplacements vision/fichiers | partiel, déclaré honnêtement |
| Phase 6 — Connectors | futur cockpit connecteurs | non raccordé |
| Phase 7 — Execution Plane | future preuve build/test/log | non raccordé |
| Phase 8 — Agent Orchestration | futur cockpit agents, Mission reste façade | non raccordé |
| Phase 9 — Security | futur état sécurité/audit | non raccordé |
| Phase 10 — Delivery | surface Preview + preuves, déploiement/verdict | surface seulement, aucune preuve simulée |

## 6. Invariants UX

- mobile prioritaire : aucun simple rétrécissement de l’interface desktop ; les zones se réordonnent ;
- cibles tactiles ≥ 44 px pour les actions principales ;
- `prefers-reduced-motion` supprime les transitions non essentielles ;
- dialogue clavier et tactile restent disponibles ;
- aucune action critique n’exige un effet 3D, WebGL ou un geste unique ;
- une capacité absente reste visible comme absente, jamais transformée en succès décoratif.

## 7. Gate dédié

`scripts/test-mission-cockpit-contract.mjs` verrouille les invariants minimaux :

- quatre lanes Mission présentes ;
- Dialogue, Preview et Feuille de route présents ;
- voix navigateur conservée ;
- Vision/Fichiers déclarés Phase 5 ;
- multi-tours AI Core conservé ;
- aucun bouton `Avancer +25%` ;
- état Mission dérivé ;
- phases multimodale et livraison toujours présentes dans la roadmap canonique.

Ce gate complète typecheck/lint/build ; il ne remplace ni test navigateur réel ni preuve fonctionnelle distante.
