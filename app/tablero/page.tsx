import type { Metadata } from "next";

import { Tablero } from "@/components/Tablero";

export const metadata: Metadata = {
  title: "Tablero · Matter",
  description: "Marcador de vóley para mostrar en la tele durante el partido.",
  // Es una herramienta para usar en la cancha, no una página para buscar.
  robots: { index: false, follow: false },
};

export default function PaginaTablero() {
  return <Tablero />;
}
