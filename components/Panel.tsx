"use client";

import { useMemo } from "react";

import { useReservas } from "@/lib/store";
import {
  BLOQUES_POR_JORNADA,
  bloques,
  etiquetaJornada,
  jornadasDeLaSemana,
  lunesDeLaSemana,
  rangoBloque,
} from "@/lib/horarios";
import {
  avisoDeConfirmacion,
  avisoDeHorarioLibre,
  avisoDeRechazo,
} from "@/lib/whatsapp";
import { Turnero } from "./Turnero";
import { GestorFijos } from "./GestorFijos";

export function Panel() {
  const {
    listo,
    pendientes,
    esperas,
    ocupacionDe,
    confirmar,
    rechazar,
    quitarEspera,
    reiniciar,
  } = useReservas();

  // Ocupación de la semana en curso: el número que el encargado mira primero.
  const ocupacion = useMemo(() => {
    if (!listo) return null;
    const jornadas = jornadasDeLaSemana(lunesDeLaSemana(new Date()));
    const total = jornadas.length * BLOQUES_POR_JORNADA;
    let tomados = 0;
    for (const jornada of jornadas) {
      for (const bloque of bloques) {
        const o = ocupacionDe(jornada, bloque);
        // Los bloqueos del encargado no cuentan como turno vendido.
        if (!o) continue;
        if (o.tipo === "reserva" && o.reserva.estado === "bloqueo") continue;
        tomados++;
      }
    }
    return { tomados, total, pct: Math.round((tomados / total) * 100) };
  }, [listo, ocupacionDe]);

  const libres = esperas.filter((e) => e.libre);

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
          valor={listo ? String(esperas.length) : "—"}
          etiqueta="Anotados en lista de espera"
          acento={listo && libres.length > 0}
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
            {pendientes.map((r) => {
              const linkOk = avisoDeConfirmacion(
                r.nombre,
                r.jornada,
                r.bloque,
                r.telefono,
              );
              const linkNo = avisoDeRechazo(r.nombre, r.jornada, r.bloque, r.telefono);
              return (
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
                      <p className="mt-2 border-l-2 border-marino-2/50 pl-3 text-sm italic text-tenue">
                        {r.nota}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {/* Es un <a> y no un botón a propósito: el navegador abre
                        WhatsApp de forma nativa y ningún bloqueador de pop-ups
                        se mete en el medio. */}
                    <a
                      href={linkNo ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => rechazar(r.id)}
                      className="flex-1 rounded-lg border border-borde px-4 py-2.5 text-center text-sm text-tenue transition-colors hover:border-bordo hover:text-hueso sm:flex-none"
                    >
                      Rechazar
                    </a>
                    <a
                      href={linkOk ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => confirmar(r.id)}
                      className="flex-1 rounded-lg bg-bordo px-4 py-2.5 text-center text-sm font-semibold text-hueso transition-colors hover:bg-bordo-2 sm:flex-none"
                    >
                      Confirmar y avisar
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {listo && pendientes.length > 0 && (
          <p className="mt-3 text-xs text-tenue">
            Al confirmar se abre WhatsApp con el mensaje ya escrito. Sólo hay que
            apretar enviar.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold text-hueso">Lista de espera</h2>
        <p className="mb-5 text-sm text-tenue">
          Gente anotada para horarios que estaban llenos.
          {libres.length > 0 && (
            <strong className="text-hueso">
              {" "}
              {libres.length} ya se {libres.length === 1 ? "liberó" : "liberaron"}.
            </strong>
          )}
        </p>

        {!listo ? (
          <div className="h-20 animate-pulse rounded-xl bg-carbon" />
        ) : esperas.length === 0 ? (
          <p className="rounded-xl border border-borde bg-carbon px-4 py-6 text-center text-sm text-tenue">
            No hay nadie en lista de espera.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {esperas.map((e) => (
              <li
                key={e.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  e.libre
                    ? "border-bordo/50 bg-bordo/15"
                    : "border-borde bg-carbon"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-hueso">
                    {e.nombre}
                    {e.libre && (
                      <span className="rounded-full bg-bordo px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider">
                        Se liberó
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-tenue">
                    {etiquetaJornada(e.jornada)} · {rangoBloque(e.bloque)}
                  </p>
                  <p className="text-sm text-tenue">{e.telefono}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => quitarEspera(e.id)}
                    className="flex-1 rounded-lg border border-borde px-4 py-2.5 text-sm text-tenue transition-colors hover:text-hueso sm:flex-none"
                  >
                    Quitar
                  </button>
                  {e.libre && (
                    <a
                      href={
                        avisoDeHorarioLibre(e.nombre, e.jornada, e.bloque, e.telefono) ??
                        undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg bg-bordo px-4 py-2.5 text-center text-sm font-semibold text-hueso transition-colors hover:bg-bordo-2 sm:flex-none"
                    >
                      Avisarle
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GestorFijos />

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
