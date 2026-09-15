"use client";

import Link from "next/link";

import {
  DIAS_CORTOS,
  bloques,
  claveFecha,
  desdeClave,
  idSlot,
  rangoBloque,
  sumarDias,
  yaPaso,
} from "@/lib/horarios";
import { useReservas } from "@/lib/store";

const CUANTOS = 4;
const DIAS_A_MIRAR = 10;

/**
 * Los primeros horarios libres a partir de ahora.
 *
 * Es la respuesta a la única pregunta que trae a alguien a la página: "¿hay
 * lugar?". Mostrarla en la portada evita que tenga que entrar al turnero para
 * enterarse.
 */
export function ProximosLibres() {
  const { listo, porSlot } = useReservas();

  // Se calcula en el render, no en un efecto: mientras `listo` es false lo que
  // se muestra es el esqueleto, así que el servidor nunca emite una hora.
  const ahora = new Date();

  // Son 90 celdas como mucho, no hace falta memorizar nada.
  const libres: Array<{ jornada: string; bloque: number }> = [];
  let jornada = claveFecha(ahora);
  for (let d = 0; d < DIAS_A_MIRAR && libres.length < CUANTOS; d++) {
    for (const bloque of bloques) {
      if (libres.length >= CUANTOS) break;
      if (yaPaso(jornada, bloque, ahora)) continue;
      if (porSlot.has(idSlot(jornada, bloque))) continue;
      libres.push({ jornada, bloque });
    }
    jornada = sumarDias(jornada, 1);
  }

  if (!listo) {
    return (
      <div className="grid gap-2 sm:grid-cols-4">
        {Array.from({ length: CUANTOS }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-carbon" />
        ))}
      </div>
    );
  }

  if (libres.length === 0) {
    return (
      <p className="rounded-xl border border-borde bg-carbon px-4 py-5 text-center text-sm text-tenue">
        No quedan horarios libres en los próximos días. Mirá el turnero para las
        semanas que vienen.
      </p>
    );
  }

  const hoy = claveFecha(ahora);
  const manana = sumarDias(hoy, 1);

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {libres.map(({ jornada, bloque }) => {
        const d = desdeClave(jornada);
        const cuando =
          jornada === hoy
            ? "Hoy"
            : jornada === manana
              ? "Mañana"
              : `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
        return (
          <Link
            key={idSlot(jornada, bloque)}
            href="/turnos"
            className="group rounded-xl border border-borde bg-carbon px-4 py-4 transition-colors hover:border-bordo-2 hover:bg-bordo/15"
          >
            <p className="text-xs uppercase tracking-wider text-bordo-2">{cuando}</p>
            <p className="mt-1 font-semibold text-hueso">{rangoBloque(bloque)}</p>
            <p className="mt-1 text-xs text-tenue group-hover:text-hueso">
              Reservar →
            </p>
          </Link>
        );
      })}
    </div>
  );
}
