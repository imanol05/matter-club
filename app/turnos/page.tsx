import type { Metadata } from "next";

import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Turnero } from "@/components/Turnero";
import { CONTACTO } from "@/lib/club";

export const metadata: Metadata = {
  title: "Turnos · Matter",
  description:
    "Mirá los horarios libres de la semana en Matter y pedí tu turno de 2 horas sin llamar a nadie.",
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
            Tocá cualquier horario libre y pedilo. No hace falta llamar ni esperar
            respuesta para saber si hay lugar: lo que ves acá es lo que hay.
            Abrimos todos los días de {CONTACTO.horario}.
          </p>
        </div>

        <Turnero />
      </main>
      <Footer />
    </>
  );
}
