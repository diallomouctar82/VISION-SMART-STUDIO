"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import ProjectPreview from "@/components/ProjectPreview";
import { MAX_MESSAGE_LENGTH } from "@/lib/studio-service";
import type { StudioProjectV3 } from "@/lib/studio-types";

export type ConversationWorkspaceProps = {
  activeProject: StudioProjectV3 | null;
  onSendMessage?: (content: string, submissionId: string) => Promise<void>;
  preview?: ReactNode;
  previewLabel?: string;
};

type WorkspaceView = "dialogue" | "preview";

function messageTime(timestamp: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function createSubmissionId(): string {
  return `message-submit-${globalThis.crypto.randomUUID()}`;
}

export function ConversationWorkspace({
  activeProject,
  onSendMessage,
  preview,
  previewLabel = "Aperçu du projet",
}: ConversationWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>("dialogue");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const submissionPendingRef = useRef(false);
  const phaseNoticeId = useId();
  const messageId = useId();
  const messageHelpId = useId();
  const sendErrorId = useId();
  const dialogueViewId = useId();
  const previewViewId = useId();
  const projectName = activeProject?.name ?? "Aucun projet sélectionné";
  const projectId = activeProject?.id ?? null;
  const draft = projectId === null ? "" : drafts[projectId] ?? "";
  const normalizedDraft = draft.trim();
  const messageLength = Array.from(draft).length;
  const canSend = Boolean(
    activeProject
      && onSendMessage
      && !isSubmitting
      && normalizedDraft
      && Array.from(normalizedDraft).length <= MAX_MESSAGE_LENGTH,
  );
  const describedBy = useMemo(
    () => [messageHelpId, phaseNoticeId, sendError ? sendErrorId : null].filter(Boolean).join(" "),
    [messageHelpId, phaseNoticeId, sendError, sendErrorId],
  );

  const setDraft = (value: string) => {
    if (projectId === null) return;
    setDrafts((current) => ({ ...current, [projectId]: value }));
    if (sendError) setSendError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject || !onSendMessage || !canSend || submissionPendingRef.current) return;

    const submittedProjectId = activeProject.id;
    const content = normalizedDraft;
    submissionPendingRef.current = true;
    setIsSubmitting(true);
    setSendError(null);
    try {
      await onSendMessage(content, createSubmissionId());
      setDrafts((current) => (
        current[submittedProjectId] === draft
          ? { ...current, [submittedProjectId]: "" }
          : current
      ));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Le message n’a pas pu être enregistré.");
    } finally {
      submissionPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) event.currentTarget.form?.requestSubmit();
  };

  return (
    <section aria-labelledby="workspace-title" className="workspace conversation-workspace">
      <header className="workspace-header">
        <div className="workspace-header__identity">
          <p className="eyebrow">PROJET ACTIF</p>
          <h2 id="workspace-title">{projectName}</h2>
        </div>
        <button aria-describedby={phaseNoticeId} className="model-pill" disabled type="button">
          Modèles IA — phase ultérieure
        </button>
      </header>

      <div aria-label="Vue du workspace" className="workspace-view-switcher">
        <button
          aria-controls={dialogueViewId}
          aria-pressed={activeView === "dialogue"}
          onClick={() => setActiveView("dialogue")}
          type="button"
        >
          Dialogue
        </button>
        <button
          aria-controls={previewViewId}
          aria-pressed={activeView === "preview"}
          onClick={() => setActiveView("preview")}
          type="button"
        >
          Aperçu
        </button>
      </div>

      <div className="conversation-workspace__content">
        <section hidden={activeView !== "dialogue"} id={dialogueViewId}>
          <div className="hero-card">
            <span aria-hidden="true" className="hero-icon">✦</span>
            <p className="eyebrow">CONVERSATION TEXTE LOCALE</p>
            <h3>De l’idée au résultat validé.</h3>
            <p>
              {activeProject
                ? activeProject.expectedOutcome
                : "Sélectionne ou crée un projet pour définir son résultat attendu."}
            </p>
          </div>

          {activeProject?.conversation.messages.length ? (
            <ol aria-label={`Conversation du projet ${activeProject.name}`} className="message-list">
              {activeProject.conversation.messages.map((message) => (
                <li
                  className={`message ${message.role === "user" ? "user-message" : "assistant-message status-message"}`}
                  key={message.id}
                >
                  <div className="message__meta">
                    <strong>
                      {message.role === "user" ? "Vous" : "Vision Smart Studio — statut système"}
                    </strong>
                    <time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>
                  </div>
                  <p>{message.content}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="message assistant-message status-message" role="note">
              <strong>Vision Smart Studio — statut système</strong>
              <p>
                Projet actif : {projectName}. La conversation texte est enregistrée localement par projet.
                Aucun modèle IA n’est connecté pour répondre pour le moment.
              </p>
            </div>
          )}
        </section>

        <section aria-label={previewLabel} hidden={activeView !== "preview"} id={previewViewId}>
          {preview ?? (activeProject ? <ProjectPreview project={activeProject} /> : (
            <div className="preview-empty-state">
              <span aria-hidden="true">▧</span>
              <h3>Aucun projet à prévisualiser</h3>
              <p>Crée ou sélectionne un projet pour afficher ses paramètres, missions et compteurs.</p>
            </div>
          ))}
        </section>
      </div>

      <form
        aria-busy={isSubmitting}
        aria-describedby={phaseNoticeId}
        className="composer"
        onSubmit={handleSubmit}
      >
        <button aria-label="Voix — disponible dans une phase ultérieure" className="icon-button" disabled type="button">
          <span aria-hidden="true">◉</span>
        </button>
        <div className="composer__field">
          <label className="visually-hidden" htmlFor={messageId}>Message</label>
          <textarea
            aria-describedby={describedBy}
            aria-invalid={sendError ? "true" : undefined}
            disabled={!activeProject || !onSendMessage || isSubmitting}
            id={messageId}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={activeProject ? "Écris ton message…" : "Sélectionne un projet pour écrire un message"}
            rows={1}
            value={draft}
          />
          <div className="composer__help" id={messageHelpId}>
            <span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span>
            <span>{messageLength}/{MAX_MESSAGE_LENGTH}</span>
          </div>
          {sendError ? <p className="composer__error" id={sendErrorId} role="alert">{sendError}</p> : null}
        </div>
        <button className="send-button" disabled={!canSend} type="submit">
          {isSubmitting ? "Enregistrement…" : "Envoyer"}
        </button>
      </form>
      <p className="phase-notice" id={phaseNoticeId}>
        Phase 2 locale : texte persistant actif. Voix et réponses de modèles IA restent désactivées tant qu’un modèle réel n’est pas connecté.
      </p>
    </section>
  );
}

export default ConversationWorkspace;
