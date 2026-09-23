import type { Metadata } from "next";

import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { TurneroConsulta } from "@/components/TurneroConsulta";
import { CONTACTO } from "@/lib/club";

export const metadata: Metadata = {
  title: "Turnos · Matter",
  description:
    "Elegí el día y el horario que querés en Matter y consultá disponibilidad por WhatsApp. Turnos de 2 horas.",
};

export default function PaginaTurnos() {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-bordo-2">Turnos</p>
          <h1 className="mt-2 text-3xl font-semibold text-hueso sm:text-4xl">
            Elegí tu horario
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-tenue">
            Marcá el día y la hora que te sirven y te armamos el mensaje para
            consultar disponibilidad. Abrimos todos los días de {CONTACTO.horario} y
            cada turno dura 2 horas.
          </p>
        </div>

        <TurneroConsulta />
      </main>
      <Footer />
    </>
  );
}
