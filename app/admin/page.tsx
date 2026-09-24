import type { Metadata } from "next";

import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PuertaEncargado } from "@/components/PuertaEncargado";

export const metadata: Metadata = {
  title: "Panel del encargado · Matter Club",
  // Que no aparezca en Google: es una pantalla interna.
  robots: { index: false, follow: false },
};

export default function PaginaAdmin() {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-bordo-2">Interno</p>
          <h1 className="mt-2 text-3xl font-semibold text-hueso sm:text-4xl">
            Panel del encargado
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-tenue">
            Todo lo que hoy se resuelve por WhatsApp, en una sola pantalla: quién
            pidió qué, qué falta confirmar y cómo viene la semana.
          </p>
        </div>

        <PuertaEncargado>
          <Panel />
        </PuertaEncargado>
      </main>
      <Footer />
    </>
  );
}
