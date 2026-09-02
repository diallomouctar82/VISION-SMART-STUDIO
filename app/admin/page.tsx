import type { Metadata } from "next";
import AdminConsole from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "Administration | VISIION Smart Studio",
  description: "Centre de contrôle des connexions, infrastructures, modèles IA et politiques de VISIION Smart Studio.",
};

export default function AdminPage() {
  return <AdminConsole />;
}

