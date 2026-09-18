"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProject,
  focusMission,
  groupMissions,
  loadStudioState,
  missionLifecycle,
  missionProgress,
  projectProgress,
  saveStudioState,
  type MissionLifecycle,
} from "@/lib/studio-store";
import type { StudioMission, StudioState, StudioTask } from "@/lib/studio-types";
import {
  continueSpecificationSession,
  startSpecificationSession,
  type SpecificationSession,
} from "@/lib/ai-core-specification";

interface SpeechResultEvent { results: ArrayLike<{ 0: { transcript: string } }> }
interface SpeechErrorEvent { error?: string }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  turn?: number;
}

type WorkspaceView = "dialogue" | "preview" | "roadmap";

type MissionLane = {
  key: MissionLifecycle;
  label: string;
  empty: string;
};

const statusLabel: Record<StudioTask["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  blocked: "Bloqué",
};

const lifecycleLabel: Record<MissionLifecycle, string> = {
  planned: "Prévue",
  active: "En cours",
  incomplete: "Inachevée",
  completed: "Terminée",
};

const missionLanes: MissionLane[] = [
  { key: "active", label: "Mission active", empty: "Aucune mission en cours." },
  { key: "incomplete", label: "Missions inachevées", empty: "Aucune mission inachevée." },
  { key: "planned", label: "Missions prévues", empty: "Aucune mission prévue." },
  { key: "completed", label: "Missions terminées", empty: "Aucune mission terminée." },
];

const roadmapPhases = [
  ["01", "Workspace visuel", "Projets, dialogue/preview, missions et progression réelle"],
  ["02", "Découverte & définition", "Conversation persistante, brief, architecture, roadmap, validation"],
  ["03", "Gateway modèles", "Fournisseurs et modèles interchangeables, routage et fallback"],
  ["04", "Model manager", "Modèles open source, santé, versions et ressources"],
  ["05", "Voix & multimodal", "Voix, transcription, synthèse et pièces jointes"],
  ["06", "Connecteurs", "GitHub, Supabase, Netlify, Vercel, VPS et services"],
  ["07", "Exécution distante", "Workers contrôlés, builds, tests, logs et preuves"],
  ["08", "Agents collaboratifs", "Décomposition, handoffs, contrôle croisé et correction"],
  ["09", "Sécurité & gouvernance", "RBAC, secrets, audit, isolation et gates"],
  ["10", "Livraison contrôlée", "Preview, release, production, vérification et rollback"],
] as const;

function friendlyAiCoreError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "AI_CORE_UNAVAILABLE";
  const separator = raw.indexOf(":");
  const code = separator >= 0 ? raw.slice(0, separator) : raw;
  const detail = separator >= 0 ? raw.slice(separator + 1).trim() : "";
  if (detail) return detail;
  if (code.includes("AI_CORE_NOT_CONFIGURED")) {
    return "Le dialogue Studio n’est pas encore autorisé auprès d’AI Core. Aucun résultat n’est simulé.";
  }
  if (code.includes("STUDIO_MODEL_UNAVAILABLE")) {
    return "AI Core est raccordé, mais aucun modèle conversationnel autorisé n’est actif pour le moment.";
  }
  if (code.includes("SESSION_EXPIRED")) {
    return "La session AI Core a expiré. Envoie ton message à nouveau pour démarrer une nouvelle conversation.";
  }
  return "AI Core est momentanément indisponible. Aucun résultat n’est simulé.";
}

function MissionSelector({
  mission,
  selected,
  onSelect,
}: {
  mission: StudioMission;
  selected: boolean;
  onSelect: () => void;
}) {
  const lifecycle = missionLifecycle(mission);
  const progress = missionProgress(mission);
  return (
    <button className={selected ? "mission-selector selected" : "mission-selector"} onClick={onSelect}>
      <span>
        <strong>{mission.title}</strong>
        <small>{lifecycleLabel[lifecycle]}</small>
      </span>
      <b>{progress}%</b>
    </button>
  );
}

export default function StudioWorkspace() {
  const [state, setState] = useState<StudioState | null>(null);
  const [intent, setIntent] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [specification, setSpecification] = useState<SpecificationSession | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [specificationError, setSpecificationError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceConversationActive, setVoiceConversationActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const specificationRef = useRef<SpecificationSession | null>(null);
  const voiceConversationActiveRef = useRef(false);
  const sendingRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const [view, setView] = useState<WorkspaceView>("dialogue");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  useEffect(() => {
    setState(loadStudioState());
  }, []);

  useEffect(() => {
    if (state) saveStudioState(state);
  }, [state]);

  useEffect(() => {
    voiceConversationActiveRef.current = voiceConversationActive;
  }, [voiceConversationActive]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    specificationRef.current = specification;
  }, [specification]);

  useEffect(() => () => {
    voiceConversationActiveRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const activeProject = useMemo(() => {
    if (!state) return null;
    return state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0] ?? null;
  }, [state]);

  const groupedMissions = useMemo(
    () => activeProject ? groupMissions(activeProject.missions) : null,
    [activeProject],
  );

  if (!state || !activeProject || !groupedMissions) {
    return <main className="loading-screen">Chargement de Vision Smart Studio…</main>;
  }

  const activeProjectId = activeProject.id;
  const suggestedMission = focusMission(activeProject);
  const selectedMission = activeProject.missions.find((mission) => mission.id === selectedMissionId) ?? suggestedMission;
  const totalProgress = projectProgress(activeProject);
  const selectedMissionProgress = selectedMission ? missionProgress(selectedMission) : 0;

  function resetDialogue() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    specificationRef.current = null;
    setSpecification(null);
    specificationRef.current = null;
    setConversation([]);
    setSpecificationError(null);
    setIntent("");
    setInputMode("text");
    setListening(false);
    setVoiceConversationActive(false);
    voiceConversationActiveRef.current = false;
    speakingRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }

  function addProject() {
    const name = window.prompt("Nom de la nouvelle application ou du nouveau projet");
    if (!name?.trim()) return;
    const project = createProject(name.trim());
    setState((current) => current ? {
      ...current,
      activeProjectId: project.id,
      projects: [...current.projects, project],
    } : current);
    setSelectedMissionId(null);
    setView("dialogue");
    resetDialogue();
  }

  function selectProject(projectId: string) {
    if (projectId === activeProjectId) return;
    setState((current) => current ? { ...current, activeProjectId: projectId } : current);
    setSelectedMissionId(null);
    setView("dialogue");
    resetDialogue();
  }

  function restartHandsFreeListening(delay = 280) {
    if (!voiceConversationActiveRef.current || sendingRef.current || speakingRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (voiceConversationActiveRef.current && !sendingRef.current && !speakingRef.current) {
        startVoiceRecognition(true);
      }
    }, delay);
  }

  function speakAssistantResponse(content: string) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpecificationError("La réponse texte a été reçue, mais la synthèse vocale du navigateur n’est pas disponible sur cet appareil.");
      if (voiceConversationActiveRef.current) restartHandsFreeListening();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    utterance.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setListening(false);
    };
    utterance.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (voiceConversationActiveRef.current) restartHandsFreeListening();
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
      setSpecificationError("La réponse AI Core est disponible en texte, mais sa lecture vocale a échoué.");
      if (voiceConversationActiveRef.current) restartHandsFreeListening();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function sendIntent(explicitText?: string, forceVoice = false) {
    const project = activeProject;
    const text = (explicitText ?? intent).trim();
    if (!project || !text || sendingRef.current) return;
    sendingRef.current = true;
    const shouldSpeakResponse = forceVoice || inputMode === "voice" || voiceConversationActiveRef.current;

    const userTurn: ConversationTurn = {
      id: `user-${Date.now()}-${conversation.length}`,
      role: "user",
      content: text,
    };
    setConversation((current) => [...current, userTurn]);
    setIntent("");
    setSending(true);
    setSpecificationError(null);

    try {
      const knownContext = {
        projectName: project.name,
        missionTitle: selectedMission?.title,
        expectedOutcome: selectedMission?.expectedOutcome,
        missionProgress: selectedMission ? missionProgress(selectedMission) : undefined,
      };
      const currentSpecification = specificationRef.current;
      const result = currentSpecification
        ? await continueSpecificationSession(
            currentSpecification.sessionId,
            currentSpecification.sessionToken,
            text,
            knownContext,
          )
        : await startSpecificationSession({
            projectId: project.id,
            missionId: selectedMission?.id,
            intent: text,
            inputMode: shouldSpeakResponse ? "voice" : inputMode,
            knownContext,
          });

      specificationRef.current = result;
      specificationRef.current = result;
      setSpecification(result);
      setConversation((current) => [...current, {
        id: `assistant-${result.sessionId}-${result.turn}`,
        role: "assistant",
        content: result.message,
        turn: result.turn,
      }]);
      if (shouldSpeakResponse) {
        speakAssistantResponse(result.message);
      }
      if (!voiceConversationActiveRef.current) setInputMode("text");
    } catch (error) {
      const message = friendlyAiCoreError(error);
      setSpecificationError(message);
      if (error instanceof Error && error.message.includes("SESSION_EXPIRED")) {
        specificationRef.current = null;
        setSpecification(null);
      }
      if (voiceConversationActiveRef.current) {
        voiceConversationActiveRef.current = false;
        setVoiceConversationActive(false);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function startVoiceRecognition(autoSend = false) {
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpecificationError("La reconnaissance vocale navigateur n’est pas disponible ici. Le raccord WhisperX/TTS AI Core reste prévu en Phase 5.");
      return;
    }
    if (recognitionRef.current) {
      suppressRecognitionErrorRef.current = true;
      recognitionRef.current.abort();
    }
    const recognition = new SpeechRecognition();
    let capturedTurn = false;
    recognitionRef.current = recognition;
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      setListening(true);
      setSpecificationError(null);
    };
    recognition.onend = () => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!capturedTurn && voiceConversationActiveRef.current && !sendingRef.current && !speakingRef.current) {
        restartHandsFreeListening(320);
      }
    };
    recognition.onresult = (event) => {
      capturedTurn = true;
      const transcript = event.results[0][0].transcript.trim();
      setIntent(transcript);
      setInputMode("voice");
      setSpecificationError(null);
      setListening(false);
      if (autoSend && transcript) {
        void sendIntent(transcript, true);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (voiceConversationActiveRef.current && (event.error === "no-speech" || event.error === "aborted")) {
        restartHandsFreeListening(350);
        return;
      }
      if (voiceConversationActiveRef.current) {
        voiceConversationActiveRef.current = false;
        setVoiceConversationActive(false);
        setSpecificationError("L’écoute vocale a été interrompue. Réactive le mode vocal pour reprendre.");
      } else {
        setSpecificationError("La reconnaissance vocale a échoué. Tu peux continuer par écrit.");
      }
    };
    recognition.start();
  }

  function startVoiceInput() {
    startVoiceRecognition(false);
  }

  function toggleHandsFreeVoice() {
    if (voiceConversationActiveRef.current) {
      voiceConversationActiveRef.current = false;
      setVoiceConversationActive(false);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      speakingRef.current = false;
      setListening(false);
      setSpeaking(false);
      setInputMode("text");
      return;
    }
    voiceConversationActiveRef.current = true;
    setVoiceConversationActive(true);
    setInputMode("voice");
    setSpecificationError(null);
    startVoiceRecognition(true);
  }

  function requestFinalSummary() {
    const prompt = "Fais maintenant la synthèse de notre échange : objectif final, décisions prises, contraintes, éléments à conserver, plan d’action et prochaine action exécutable. Ensuite poursuis la mission à partir de cette synthèse sans perdre le contexte.";
    void sendIntent(prompt, voiceConversationActiveRef.current);
  }

  const aiCoreStatus = specification
    ? `${specification.stage} · tour ${specification.turn}`
    : "Prêt pour une session gouvernée";

  return (
    <main className="studio-shell">
      <aside className="panel sidebar">
        <div className="brand-block">
          <p className="eyebrow">VISION SMART</p>
          <h1>Studio</h1>
          <p className="brand-copy">Poste de création et de pilotage relié à AI Core.</p>
        </div>

        <div className="core-card">
          <span className="status-dot" />
          <div>
            <strong>AI Core central</strong>
            <p>Gouvernance, mémoire, sécurité et orchestration.</p>
          </div>
        </div>

        <button className="primary-button" onClick={addProject}>+ Nouvelle application</button>

        <section>
          <h2>Applications / projets</h2>
          <div className="stack project-list">
            {state.projects.map((project) => (
              <button
                className={project.id === activeProjectId ? "project active" : "project"}
                key={project.id}
                onClick={() => selectProject(project.id)}
              >
                <span className="project-dot" />
                <span>
                  <strong>{project.name}</strong>
                  <small>{projectProgress(project)}% · {project.missions.length} mission{project.missions.length > 1 ? "s" : ""}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="roadmap-summary">
          <p className="eyebrow">CAPACITÉS STUDIO</p>
          <div className="capability-line"><span>Dialogue AI Core</span><strong>Raccord en cours</strong></div>
          <div className="capability-line"><span>Preview réel</span><strong>À raccorder</strong></div>
          <div className="capability-line"><span>Dialogue vocal</span><strong>Mode mains libres</strong></div>
          <div className="capability-line"><span>Réponse vocale</span><strong>Lecture automatique · même session</strong></div>
          <div className="capability-line"><span>Vision / fichiers</span><strong>Phase 5</strong></div>
          <div className="capability-line"><span>Déploiement</span><strong>Phase 10</strong></div>
        </section>

        <section className="sidebar-footer">
          <span className="status-dot" /> État local sauvegardé · secrets hors navigateur
        </section>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">APPLICATION ACTIVE</p>
            <h2>{activeProject.name}</h2>
          </div>
          <div className="runtime-cluster">
            <span className="runtime-state">{aiCoreStatus}</span>
            <div className="model-pill">{specification?.modelBackend ? `Modèle · ${specification.modelBackend}` : "Modèle · routage AI Core"}</div>
          </div>
        </header>

        <nav className="workspace-tabs" aria-label="Espace de travail">
          <button className={view === "dialogue" ? "workspace-tab active" : "workspace-tab"} onClick={() => setView("dialogue")}>Dialogue</button>
          <button className={view === "preview" ? "workspace-tab active" : "workspace-tab"} onClick={() => setView("preview")}>Preview</button>
          <button className={view === "roadmap" ? "workspace-tab active" : "workspace-tab"} onClick={() => setView("roadmap")}>Feuille de route</button>
        </nav>

        {view === "dialogue" ? (
          <>
            <div className="conversation" aria-live="polite">
              <div className="hero-card">
                <span className="hero-icon">✦</span>
                <p className="eyebrow">MISSION → RÉSULTAT</p>
                <h3>De l’idée à la mise en ligne, sous gouvernance AI Core.</h3>
                <p>
                  Décris le résultat attendu. Studio fournit l’expérience humaine ; AI Core garde la logique,
                  la mémoire, les agents, les modèles, les contrôles et la continuité de la mission.
                </p>
                <div className="journey-strip" aria-label="Chaîne de livraison">
                  <span>Comprendre</span><span>Spécifier</span><span>Planifier</span><span>Construire</span><span>Tester</span><span>Corriger</span><span>Revoir</span><span>Preview</span><span>Déployer</span><span>Vérifier</span>
                </div>
              </div>

              <div className="message assistant-message">
                <strong>Vision Smart Studio · AI Core</strong>
                <p>
                  {selectedMission
                    ? `Mission ciblée : ${selectedMission.title}. Quel résultat veux-tu obtenir ou corriger ?`
                    : `Projet actif : ${activeProject.name}. Quel résultat veux-tu atteindre ?`}
                </p>
              </div>

              {conversation.map((turn) => (
                <div
                  className={turn.role === "assistant" ? "message assistant-message" : "message user-message"}
                  key={turn.id}
                  data-role={turn.role}
                  data-turn={turn.turn}
                >
                  <strong>{turn.role === "assistant" ? "AI Core" : "Vous"}</strong>
                  <p>{turn.content}</p>
                </div>
              ))}

              {sending ? (
                <div className="message assistant-message" aria-label="AI Core prépare sa réponse">
                  <strong>AI Core</strong>
                  <p>Analyse de la mission en cours…</p>
                </div>
              ) : null}

              {specificationError ? (
                <div className="message assistant-message" role="alert">
                  <strong>Dialogue non disponible</strong>
                  <p>{specificationError}</p>
                </div>
              ) : null}
            </div>

            <div className="composer-shell">
              <div className="input-mode-note">
                {voiceConversationActive
                  ? speaking
                    ? "AI Core parle… puis l’écoute reprendra automatiquement"
                    : listening
                      ? "Conversation vocale active · je t’écoute…"
                      : sending
                        ? "Conversation vocale active · AI Core prépare sa réponse…"
                        : "Conversation vocale active · reprise de l’écoute…"
                  : listening
                    ? "Dictée ponctuelle en cours…"
                    : inputMode === "voice"
                      ? "Transcription vocale prête à envoyer"
                      : "Texte actif"}
                <span>· Même session AI Core · envoi automatique · réponse vocale · reprise d’écoute</span>
              </div>
              <div className="composer">
                <button
                  className={voiceConversationActive ? "icon-button voice-active" : "icon-button"}
                  aria-label={voiceConversationActive ? "Arrêter la conversation vocale" : "Démarrer la conversation vocale mains libres"}
                  title={voiceConversationActive ? "Arrêter le dialogue vocal" : "Dialogue vocal mains libres — parler, recevoir la réponse, continuer"}
                  onClick={toggleHandsFreeVoice}
                  disabled={sending && !voiceConversationActive}
                >{speaking ? "◖" : listening ? "●" : voiceConversationActive ? "■" : "◉"}</button>
                <button className="icon-button" aria-label="Vision non encore raccordée" title="Vision — prévue Phase 5" disabled>◎</button>
                <button className="icon-button" aria-label="Fichier non encore raccordé" title="Fichiers — prévus Phase 5" disabled>＋</button>
                <input
                  aria-label="Message"
                  placeholder={specification ? "Continue la mission avec AI Core…" : "Parle ou écris ton idée, ta mission, ton bug ou ton objectif…"}
                  value={intent}
                  disabled={sending}
                  onChange={(event) => { setIntent(event.target.value); setInputMode("text"); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendIntent();
                    }
                  }}
                />
                <button className="send-button" disabled={sending || !intent.trim()} onClick={() => void sendIntent()}>
                  {sending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
              {specification && conversation.length >= 2 ? (
                <button
                  className="summary-button"
                  onClick={requestFinalSummary}
                  disabled={sending || speaking}
                >
                  Synthèse & mise au travail
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {view === "preview" ? (
          <div className="workspace-surface">
            <div className="surface-heading">
              <div>
                <p className="eyebrow">PREVIEW & TESTS</p>
                <h3>Résultat observable avant livraison.</h3>
              </div>
              <span className="honesty-pill">NON RACCORDÉ</span>
            </div>
            <div className="preview-empty">
              <strong>Aucune preview distante certifiée n’est raccordée à ce projet.</strong>
              <p>
                Cette zone accueillera l’URL de preview, le rendu téléphone/ordinateur, les résultats de build,
                tests, sécurité et la preuve de vérification. Studio ne simule pas une preview inexistante.
              </p>
            </div>
            <div className="evidence-grid">
              <article><span>Build</span><strong>En attente de source réelle</strong></article>
              <article><span>Tests</span><strong>En attente de source réelle</strong></article>
              <article><span>Sécurité</span><strong>En attente de source réelle</strong></article>
              <article><span>Déploiement</span><strong>En attente de source réelle</strong></article>
            </div>
          </div>
        ) : null}

        {view === "roadmap" ? (
          <div className="workspace-surface">
            <div className="surface-heading">
              <div>
                <p className="eyebrow">FEUILLE DE ROUTE CANONIQUE</p>
                <h3>Le Studio grandit par capacités, sans déplacer AI Core.</h3>
              </div>
              <span className="honesty-pill">docs/ROADMAP.md</span>
            </div>
            <p className="surface-copy">
              Les phases structurent la livraison du produit Studio. Elles n’autorisent pas à inventer un état :
              une capacité n’est « active » que lorsqu’elle est réellement raccordée et prouvée.
            </p>
            <div className="roadmap-grid">
              {roadmapPhases.map(([phase, title, description]) => (
                <article className="roadmap-card" key={phase}>
                  <span>{phase}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="panel task-panel">
        <div className="task-header">
          <div>
            <p className="eyebrow">PROJET</p>
            <h2>Mission</h2>
          </div>
          <strong>{totalProgress}%</strong>
        </div>
        <div className="progress-track" aria-label={`Progression projet ${totalProgress}%`}>
          <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
        </div>
        <p className="progress-truth">Progression calculée depuis les tâches enregistrées. Aucun avancement manuel fictif.</p>

        <section className="mission-navigator" aria-label="Missions du projet">
          {missionLanes.map((lane) => {
            const missions = groupedMissions[lane.key];
            return (
              <div className="mission-lane" key={lane.key}>
                <div className="mission-lane-title">
                  <span>{lane.label}</span><b>{missions.length}</b>
                </div>
                {missions.length ? missions.map((mission) => (
                  <MissionSelector
                    key={mission.id}
                    mission={mission}
                    selected={selectedMission?.id === mission.id}
                    onSelect={() => setSelectedMissionId(mission.id)}
                  />
                )) : <p className="empty-lane">{lane.empty}</p>}
              </div>
            );
          })}
        </section>

        {selectedMission ? (
          <section className="mission-block">
            <div className="mission-heading">
              <div>
                <p className="eyebrow">MISSION SÉLECTIONNÉE</p>
                <strong>{selectedMission.title}</strong>
              </div>
              <span>{selectedMissionProgress}%</span>
            </div>
            <p className="mission-outcome">{selectedMission.expectedOutcome}</p>
            <div className="stack task-list">
              {selectedMission.tasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-line">
                    <strong>{task.label}</strong>
                    <span>{task.progress}%</span>
                  </div>
                  <p>{statusLabel[task.status]}</p>
                  <div className="mini-track" aria-label={`Progression tâche ${task.progress}%`}>
                    <div className="mini-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="validation-card">Aucune mission enregistrée pour ce projet.</div>
        )}

        <section className="operations-card">
          <p className="eyebrow">PILOTAGE ÉTENDU</p>
          <div><span>Bugs & incidents</span><strong>Phase 7/9</strong></div>
          <div><span>Agents & modèles</span><strong>Phase 3/4/8</strong></div>
          <div><span>Sécurité</span><strong>Phase 9</strong></div>
          <div><span>Déploiements</span><strong>Phase 10</strong></div>
        </section>

        <div className="validation-card">
          <p className="eyebrow">RÈGLE DE LIVRAISON</p>
          <strong>GREEN → continuer · RED → corriger puis retester</strong>
          <p>Une mission n’est terminée ni au code ni au merge : le résultat attendu doit être livré et vérifié.</p>
        </div>
      </aside>
    </main>
  );
}
