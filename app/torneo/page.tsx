import type { Metadata } from "next";

import { Torneo } from "@/components/Torneo";

export const metadata: Metadata = {
  title: "Torneo · Matter",
  description: "Estadísticas de vóley por jugador y premios del torneo.",
  // Es una herramienta para usar en la cancha, no una página para buscar.
  robots: { index: false, follow: false },
};

export default function PaginaTorneo() {
  return <Torneo />;
}
