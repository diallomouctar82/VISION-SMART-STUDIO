import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { SupabaseAdminRepository } from "@/lib/admin-repository";
import type { AdminInventory, AdminRole, WorkspaceAccess } from "@/lib/admin-types";

const NOW = "2026-09-02T00:00:00.000Z";
const WORKSPACE = {
  created_at: NOW,
  created_by: "user-1",
  id: "workspace-1",
  name: "VISIION Smart Studio",
  resource_version: 1,
  slug: "visiion-smart-studio",
  updated_at: NOW,
};

const INVENTORY: AdminInventory = {
  settings: {
    created_at: NOW,
    default_environment: "development",
    max_action_retries: 2,
    max_monthly_cost_usd: 10,
    operating_mode: "hybrid",
    require_internal_for_confidential: true,
    require_production_approval: true,
    resource_version: 1,
    updated_at: NOW,
    workspace_id: WORKSPACE.id,
  },
  members: [],
  secretReferences: [],
  connectors: [],
  hostingTargets: [],
  workers: [],
  providers: [],
  models: [],
  modelDeployments: [],
  routingPolicies: [],
  actionRequests: [],
  connectionChecks: [],
  auditEvents: [],
};

function accessFor(role: AdminRole): WorkspaceAccess {
  return { role, workspace: WORKSPACE };
}

function repositoryWith(overrides: Record<string, unknown> = {}): SupabaseAdminRepository {
  return {
    loadInventory: vi.fn().mockResolvedValue(INVENTORY),
    createConnector: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as SupabaseAdminRepository;
}

function renderDashboard(role: AdminRole, repository: SupabaseAdminRepository) {
  const access = accessFor(role);
  return render(
    <AdminDashboard
      access={access}
      onReloadWorkspaces={vi.fn().mockResolvedValue(undefined)}
      onSelectWorkspace={vi.fn()}
      onSignOut={vi.fn().mockResolvedValue(undefined)}
      repository={repository}
      userEmail="admin@example.com"
      workspaces={[access]}
    />,
  );
}

describe("administrative dashboard interactions", () => {
  it("keeps a creation form open and preserves its values when persistence fails", async () => {
    const user = userEvent.setup();
    const createConnector = vi.fn().mockRejectedValue(new Error("Connexion Supabase indisponible."));
    renderDashboard("admin", repositoryWith({ createConnector }));

    await screen.findByRole("heading", { name: "État opérationnel" });
    await user.click(screen.getByRole("button", { name: "Connexions" }));
    const disclosure = screen.getByText("Ajouter une connexion").closest("details");
    expect(disclosure).not.toBeNull();
    await user.click(screen.getByText("Ajouter une connexion"));
    const form = within(disclosure as HTMLElement);

    const name = form.getByRole("textbox", { name: "Nom" });
    await user.type(name, "GitHub production");
    await user.type(form.getByRole("textbox", { name: "Capacités" }), "repository.read");
    await user.click(form.getByRole("button", { name: "Enregistrer le connecteur" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Connexion Supabase indisponible.");
    expect(name).toHaveValue("GitHub production");
    expect(name.closest("details")).toHaveAttribute("open");
    expect(createConnector).toHaveBeenCalledTimes(1);
  });

  it("lets an operator read audit evidence and configure routing", async () => {
    const user = userEvent.setup();
    renderDashboard("operator", repositoryWith());

    await screen.findByRole("heading", { name: "État opérationnel" });
    await user.click(screen.getByRole("button", { name: "Audit" }));
    expect(screen.getByRole("heading", { name: "Journal et preuves d’exécution" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Routage" }));
    await user.click(screen.getByText("Ajouter une politique de routage"));
    expect(screen.getByRole("button", { name: "Enregistrer la politique" })).toBeEnabled();
  });
});
