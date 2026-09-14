import { createFileRoute, redirect } from "@tanstack/react-router";

// La facturación ahora vive dentro de Negocio → Configuración → Facturación y Créditos.
export const Route = createFileRoute("/billing")({
  beforeLoad: () => {
    throw redirect({ to: "/negocio" });
  },
  component: () => null,
});
