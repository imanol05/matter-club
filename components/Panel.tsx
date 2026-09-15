"use client";

import { useMemo } from "react";

import { useReservas } from "@/lib/store";
import {
  BLOQUES_POR_JORNADA,
  etiquetaJornada,
  jornadasDeLaSemana,
  lunesDeLaSemana,
  idSlot,
  rangoBloque,
  bloques,
} from "@/lib/horarios";
import { Turnero } from "./Turnero";

export function Panel() {
  const { listo, pendientes, porSlot, confirmar, rechazar, reiniciar } =
    useReservas();

  // Ocupación de la semana en curso: el número que el encargado mira primero.
  const ocupacion = useMemo(() => {
    if (!listo) return null;
    const jornadas = jornadasDeLaSemana(lunesDeLaSemana(new Date()));
    const total = jornadas.length * BLOQUES_POR_JORNADA;
    let tomados = 0;
    for (const jornada of jornadas) {
      for (const bloque of bloques) {
        const r = porSlot.get(idSlot(jornada, bloque));
        if (r && r.estado !== "bloqueo") tomados++;
      }
    }
    return { tomados, total, pct: Math.round((tomados / total) * 100) };
  }, [listo, porSlot]);

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-3 sm:grid-cols-3">
        <Tarjeta
          valor={listo ? String(pendientes.length) : "—"}
          etiqueta="Pedidos esperando respuesta"
          acento={listo && pendientes.length > 0}
        />
        <Tarjeta
          valor={ocupacion ? `${ocupacion.pct}%` : "—"}
          etiqueta="Ocupación de esta semana"
        />
        <Tarjeta
          valor={ocupacion ? `${ocupacion.total - ocupacion.tomados}` : "—"}
          etiqueta="Horarios libres esta semana"
        />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-hueso">
          Pedidos para confirmar
        </h2>

        {!listo ? (
          <div className="h-24 animate-pulse rounded-xl bg-carbon" />
        ) : pendientes.length === 0 ? (
          <p className="rounded-xl border border-borde bg-carbon px-4 py-6 text-center text-sm text-tenue">
            No hay pedidos pendientes. Todo al día.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendientes.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-4 rounded-xl border border-marino-2/40 bg-marino/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-hueso">{r.nombre}</p>
                  <p className="mt-0.5 text-sm text-tenue">
                    {etiquetaJornada(r.jornada)} · {rangoBloque(r.bloque)}
                  </p>
                  <p className="mt-0.5 text-sm text-tenue">{r.telefono}</p>
                  {r.nota && (
                    <p className="mt-2 border-l-2 border-marino-2/50 pl-3 text-sm text-tenue italic">
                      {r.nota}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => rechazar(r.id)}
                    className="flex-1 rounded-lg border border-borde px-4 py-2.5 text-sm text-tenue transition-colors hover:border-bordo hover:text-hueso sm:flex-none"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmar(r.id)}
                    className="flex-1 rounded-lg bg-bordo px-4 py-2.5 text-sm font-semibold text-hueso transition-colors hover:bg-bordo-2 sm:flex-none"
                  >
                    Confirmar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold text-hueso">Agenda de la semana</h2>
        <p className="mb-5 text-sm text-tenue">
          Pasá el mouse por cualquier turno para ver el teléfono.
        </p>
        <Turnero modo="encargado" />
      </section>

      <section className="rounded-xl border border-borde bg-carbon/50 p-4">
        <p className="text-sm text-tenue">
          <strong className="text-hueso">Esto es una demo.</strong> Los datos viven
          en este navegador, no hay servidor todavía. Si querés volver a la agenda
          de ejemplo original:
        </p>
        <button
          type="button"
          onClick={reiniciar}
          className="mt-3 rounded-lg border border-borde px-4 py-2 text-sm text-tenue transition-colors hover:border-bordo-2 hover:text-hueso"
        >
          Reiniciar datos de ejemplo
        </button>
      </section>
    </div>
  );
}

function Tarjeta({
  valor,
  etiqueta,
  acento = false,
}: {
  valor: string;
  etiqueta: string;
  acento?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        acento ? "border-bordo/50 bg-bordo/15" : "border-borde bg-carbon"
      }`}
    >
      <p className="text-3xl font-semibold text-hueso">{valor}</p>
      <p className="mt-1 text-sm text-tenue">{etiqueta}</p>
    </div>
  );
}
