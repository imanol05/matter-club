import type { Metadata } from "next";

import { TableroTele } from "@/components/TableroTele";

export const metadata: Metadata = {
  title: "Tablero en la tele · Matter",
  description: "Pantalla del marcador de vóley, controlada desde el celu.",
  robots: { index: false, follow: false },
};

export default function PaginaTableroTele() {
  return <TableroTele />;
}
