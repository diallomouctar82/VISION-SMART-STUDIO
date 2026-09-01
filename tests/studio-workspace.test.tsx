import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSetupDialog } from "@/components/ProjectSetupDialog";
import StudioWorkspace from "@/components/StudioWorkspace";
import { STUDIO_STORAGE_KEY } from "@/lib/studio-repository";
import type { StudioStateV3 } from "@/lib/studio-types";

async function fillProjectSetup(
  user: ReturnType<typeof userEvent.setup>,
  name = "Projet reprise",
) {
  await user.click(await screen.findByRole("button", { name: "Nouveau projet" }));
  const dialog = await screen.findByRole("dialog", { name: "Configurer le projet" });
  const form = within(dialog);
  await user.type(form.getByRole("textbox", { name: "Nom du projet" }), name);
  await user.type(form.getByRole("textbox", { name: "Description" }), "Application locale de suivi.");
  await user.type(
    form.getByRole("textbox", { name: "Résultat attendu" }),
    "Un parcours de projet vérifiable et repris après actualisation.",
  );
  await user.type(form.getByRole("textbox", { name: "Titre de la mission" }), "Lancer le produit");
  await user.type(
    form.getByRole("textbox", { name: "Résultat de la mission" }),
    "Obtenir une première version validée.",
  );
  await user.type(form.getByRole("textbox", { name: "Activité 1" }), "Cadrer le parcours");
  return { dialog, form };
}

describe("Phase 1 studio workspace integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the three zones and reopens a newly persisted project", async () => {
    const user = userEvent.setup();
    const firstRender = render(<StudioWorkspace />);

    expect(await screen.findByRole("complementary", { name: "Studio" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Vision Smart Studio" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Progression validée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modèles IA — phase ultérieure" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voix — disponible dans une phase ultérieure" })).toBeDisabled();

    const { form } = await fillProjectSetup(user);
    await user.dblClick(form.getByRole("button", { name: "Créer le projet" }));

    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aperçu" }));
    const preview = within(screen.getByRole("region", { name: "Aperçu du projet" }));
    expect(preview.getByText("Application locale de suivi.")).toBeInTheDocument();
    expect(preview.getByText("Un parcours de projet vérifiable et repris après actualisation.")).toBeInTheDocument();
    expect(preview.getByText("Lancer le produit")).toBeInTheDocument();
    expect(preview.getByText("1 activité")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Vision Smart Studio/ }));
    expect(await screen.findByRole("heading", { name: "Vision Smart Studio", level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Projet reprise/ }));
    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();

    await user.click(screen.getAllByText("Contrôles de la tâche")[0]);
    const firstCheckpoint = screen.getAllByRole("checkbox")[0];
    await user.click(firstCheckpoint);
    expect(firstCheckpoint).toBeChecked();

    await waitFor(() => {
      const rawState = window.localStorage.getItem(STUDIO_STORAGE_KEY);
      expect(rawState).not.toBeNull();
      const state = JSON.parse(rawState!) as StudioStateV3;
      const activeProject = state.projects.find((project) => project.id === state.activeProjectId);
      expect(activeProject?.name).toBe("Projet reprise");
      expect(activeProject?.missions[0].tasks[0].checkpoints[0].verified).toBe(true);
    });

    const stored = JSON.parse(window.localStorage.getItem(STUDIO_STORAGE_KEY)!) as StudioStateV3;
    expect(stored.version).toBe(4);
    expect(stored.revision).toBe(4);
    expect(stored.projects).toHaveLength(2);
    expect(stored.projects.find((project) => project.id === stored.activeProjectId)?.name).toBe("Projet reprise");

    firstRender.unmount();
    render(<StudioWorkspace />);

    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Projet reprise/ })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getAllByText("Contrôles de la tâche")[0]);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("exposes corrupt local state without overwriting it or enabling mutations", async () => {
    const corruptSnapshot = "{snapshot-invalide";
    window.localStorage.setItem(STUDIO_STORAGE_KEY, corruptSnapshot);

    render(<StudioWorkspace />);

    expect(await screen.findByText(/État local corrompu détecté/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouveau projet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Paramètres du projet/ })).toBeDisabled();
    expect(window.localStorage.getItem(STUDIO_STORAGE_KEY)).toBe(corruptSnapshot);
  });

  it("updates project settings and surfaces duplicate-name errors without losing the form", async () => {
    const user = userEvent.setup();
    render(<StudioWorkspace />);

    const { form } = await fillProjectSetup(user, "Projet configurable");
    await user.click(form.getByRole("button", { name: "Créer le projet" }));
    expect(await screen.findByRole("heading", { name: "Projet configurable", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Paramètres du projet Projet configurable" }));
    const settingsDialog = await screen.findByRole("dialog", { name: "Paramètres du projet" });
    const settings = within(settingsDialog);
    const nameField = settings.getByRole("textbox", { name: "Nom du projet" });
    await user.clear(nameField);
    await user.type(nameField, "Projet renommé");
    await user.selectOptions(settings.getByRole("combobox", { name: "Statut" }), "active");
    await user.selectOptions(settings.getByRole("combobox", { name: "Environnement cible" }), "staging");
    await user.click(settings.getByRole("button", { name: "Enregistrer les paramètres" }));

    expect(await screen.findByRole("heading", { name: "Projet renommé", level: 2 })).toBeInTheDocument();

    const duplicate = await fillProjectSetup(user, "Projet renommé");
    await user.click(duplicate.form.getByRole("button", { name: "Créer le projet" }));
    expect(await duplicate.form.findByRole("alert")).toHaveTextContent("Un projet portant ce nom existe déjà");
    expect(duplicate.form.getByRole("textbox", { name: "Nom du projet" })).toHaveValue("Projet renommé");
  });

  it("validates project data and confirms cancellation before discarding it", async () => {
    const user = userEvent.setup();
    render(<StudioWorkspace />);

    const createButton = await screen.findByRole("button", { name: "Nouveau projet" });
    await user.click(createButton);
    const dialog = await screen.findByRole("dialog", { name: "Configurer le projet" });
    const form = within(dialog);
    expect(createButton.closest("[inert]")).not.toBeNull();
    const nameField = form.getByRole("textbox", { name: "Nom du projet" });
    await user.type(form.getByRole("textbox", { name: "Dépôt HTTPS (optionnel)" }), "http://example.test/repo");
    await user.click(form.getByRole("button", { name: "Créer le projet" }));

    expect(form.getByRole("alert")).toHaveTextContent("Utilise une URL HTTPS");
    await waitFor(() => expect(nameField).toHaveFocus());

    const cancelButton = form.getByRole("button", { name: "Annuler" });
    await user.click(cancelButton);
    const discardDialog = screen.getByRole("alertdialog", { name: "Abandonner les modifications ?" });
    await waitFor(() => expect(within(discardDialog).getByRole("button", { name: "Continuer la saisie" })).toHaveFocus());
    expect(dialog).toHaveAttribute("inert");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(cancelButton).toHaveFocus());
    expect(screen.queryByRole("alertdialog", { name: "Abandonner les modifications ?" })).not.toBeInTheDocument();
    expect(dialog).toBeInTheDocument();

    await user.click(cancelButton);
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Abandonner" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Configurer le projet" })).not.toBeInTheDocument());
    await waitFor(() => expect(createButton).toHaveFocus());
    expect(createButton.closest("[inert]")).toBeNull();
  });

  it("focuses dynamic activities and recalculates duplicate errors after edits", async () => {
    const user = userEvent.setup();
    render(<StudioWorkspace />);

    await user.click(await screen.findByRole("button", { name: "Nouveau projet" }));
    const dialog = await screen.findByRole("dialog", { name: "Configurer le projet" });
    const form = within(dialog);
    const firstActivity = form.getByRole("textbox", { name: "Activité 1" });
    await user.type(firstActivity, "Cadrer   le produit");
    await user.click(form.getByRole("button", { name: "Ajouter une activité" }));
    const secondActivity = form.getByRole("textbox", { name: "Activité 2" });
    await waitFor(() => expect(secondActivity).toHaveFocus());
    await user.type(secondActivity, "cadrer le produit");
    await user.click(form.getByRole("button", { name: "Créer le projet" }));
    expect(secondActivity).toHaveAttribute("aria-invalid", "true");

    await user.clear(firstActivity);
    await user.type(firstActivity, "Découvrir le besoin");
    expect(secondActivity).not.toHaveAttribute("aria-invalid");
    expect(form.queryByText("Chaque activité doit avoir un libellé distinct.")).not.toBeInTheDocument();

    await user.click(form.getByRole("button", { name: "Ajouter une activité" }));
    const thirdActivity = form.getByRole("textbox", { name: "Activité 3" });
    await waitFor(() => expect(thirdActivity).toHaveFocus());
    await user.click(form.getByRole("button", { name: "Retirer l’activité 3" }));
    await waitFor(() => expect(secondActivity).toHaveFocus());
  });

  it("locks every project setup control and ignores re-entry while submission is pending", async () => {
    const user = userEvent.setup();
    let resolveSubmission!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => {
      resolveSubmission = resolve;
    }));
    render(<ProjectSetupDialog mode="create" onCancel={vi.fn()} onSubmit={onSubmit} />);

    const dialog = await screen.findByRole("dialog", { name: "Configurer le projet" });
    const form = within(dialog);
    await user.type(form.getByRole("textbox", { name: "Nom du projet" }), "Projet verrouillé");
    await user.type(form.getByRole("textbox", { name: "Description" }), "Description complète");
    await user.type(form.getByRole("textbox", { name: "Résultat attendu" }), "Résultat vérifiable");
    await user.type(form.getByRole("textbox", { name: "Titre de la mission" }), "Mission initiale");
    await user.type(form.getByRole("textbox", { name: "Résultat de la mission" }), "Mission validée");
    await user.type(form.getByRole("textbox", { name: "Activité 1" }), "Activité initiale");

    await user.dblClick(form.getByRole("button", { name: "Créer le projet" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(dialog).toHaveAttribute("aria-busy", "true");
    form.getAllByRole("textbox").forEach((control) => expect(control).toBeDisabled());
    form.getAllByRole("combobox").forEach((control) => expect(control).toBeDisabled());
    expect(form.getByRole("button", { name: "Ajouter une activité" })).toBeDisabled();
    expect(form.getByRole("button", { name: "Annuler" })).toBeDisabled();
    expect(form.getByRole("button", { name: "Enregistrement…" })).toBeDisabled();
    expect(form.getByRole("button", { name: "Fermer" })).toBeDisabled();

    resolveSubmission();
    await waitFor(() => expect(dialog).toHaveAttribute("aria-busy", "false"));
    expect(form.getByRole("textbox", { name: "Nom du projet" })).toBeEnabled();
  });

  it("creates missions and activities, then declares and resolves a structured blocker", async () => {
    const user = userEvent.setup();
    render(<StudioWorkspace />);
    expect(await screen.findByRole("complementary", { name: "Progression validée" })).toBeInTheDocument();

    await user.click(screen.getByText("Nouvelle mission", { selector: "summary" }));
    await user.type(screen.getByRole("textbox", { name: "Titre" }), "Expérience mobile");
    await user.type(
      screen.getByRole("textbox", { name: "Résultat attendu" }),
      "Une expérience mobile validée.",
    );
    await user.click(screen.getByRole("button", { name: "Créer la mission" }));
    expect(await screen.findByRole("heading", { name: "Expérience mobile", level: 3 })).toBeInTheDocument();

    await user.click(screen.getByText("Ajouter une activité", { selector: "summary" }));
    await user.type(screen.getByRole("textbox", { name: "Libellé de l’activité" }), "Tester le mobile");
    await user.click(screen.getByRole("button", { name: "Ajouter l’activité" }));
    const taskHeading = await screen.findByRole("heading", { name: "Tester le mobile", level: 4 });
    const task = taskHeading.closest("article");
    expect(task).not.toBeNull();
    const taskView = within(task!);

    await user.click(taskView.getByText("Déclarer un blocage", { selector: "summary" }));
    await user.type(taskView.getByRole("textbox", { name: "Cause du blocage" }), "Appareil indisponible");
    await user.type(taskView.getByRole("textbox", { name: "Action requise" }), "Fournir un appareil");
    await user.type(taskView.getByRole("textbox", { name: "Condition de reprise" }), "Appareil connecté");
    await user.click(taskView.getByRole("button", { name: "Déclarer le blocage" }));

    expect(await screen.findByRole("heading", { name: "Blocage déclaré", level: 5 })).toBeInTheDocument();
    await user.dblClick(screen.getByRole("button", {
      name: "Signaler le blocage résolu pour l’activité Tester le mobile",
    }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Blocage déclaré" })).not.toBeInTheDocument());
  });
});
