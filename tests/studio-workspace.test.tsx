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
    await waitFor(() => expect(window.localStorage.getItem(STUDIO_STORAGE_KEY)).not.toBeNull());

    const stored = JSON.parse(window.localStorage.getItem(STUDIO_STORAGE_KEY)!) as StudioStateV3;
    expect(stored.version).toBe(3);
    expect(stored.revision).toBe(1);
    expect(stored.projects.find((project) => project.id === stored.activeProjectId)?.name).toBe("Projet reprise");

    firstRender.unmount();
    render(<StudioWorkspace />);

    expect(await screen.findByRole("heading", { name: "Projet reprise", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projet reprise" })).toHaveAttribute("aria-current", "page");
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
