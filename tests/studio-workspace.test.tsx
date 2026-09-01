import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import StudioWorkspace from "@/components/StudioWorkspace";
import { STUDIO_STORAGE_KEY } from "@/lib/studio-repository";
import type { StudioStateV3 } from "@/lib/studio-types";

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

    await user.type(screen.getByRole("textbox", { name: "Nouveau projet" }), "Projet reprise");
    await user.click(screen.getByRole("button", { name: "Créer" }));

    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vision Smart Studio" }));
    expect(await screen.findByRole("heading", { name: "Vision Smart Studio", level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Projet reprise" }));
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
    expect(stored.version).toBe(3);
    expect(stored.revision).toBe(4);
    expect(stored.projects.find((project) => project.id === stored.activeProjectId)?.name).toBe("Projet reprise");

    firstRender.unmount();
    render(<StudioWorkspace />);

    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projet reprise" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getAllByText("Contrôles de la tâche")[0]);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("exposes corrupt local state without overwriting it or enabling mutations", async () => {
    const corruptSnapshot = "{snapshot-invalide";
    window.localStorage.setItem(STUDIO_STORAGE_KEY, corruptSnapshot);

    render(<StudioWorkspace />);

    expect(await screen.findByText(/État local corrompu détecté/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nouveau projet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Créer" })).toBeDisabled();
    expect(window.localStorage.getItem(STUDIO_STORAGE_KEY)).toBe(corruptSnapshot);
  });
});
