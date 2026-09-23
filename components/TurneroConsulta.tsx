"use client";

import { useState } from "react";

import {
  DIAS_CORTOS,
  SEMANAS_A_FUTURO,
  bloques,
  claveFecha,
  desdeClave,
  etiquetaSemana,
  horaInicio,
  jornadasDeLaSemana,
  lunesDeLaSemana,
  rangoBloque,
  sumarDias,
  yaPaso,
} from "@/lib/horarios";
import { consultaDeTurno } from "@/lib/whatsapp";

/**
 * Selector de horario que termina en WhatsApp.
 *
 * Es el turnero público mientras no haya base de datos. A propósito NO muestra
 * qué está ocupado y qué no: sin backend no tenemos forma de saberlo, y pintar
 * disponibilidad inventada sería peor que no mostrar nada — alguien vería un
 * horario "libre" que en realidad está dado, o al revés.
 *
 * Lo que sí puede hacer es armarle el mensaje al cliente con el día y la hora
 * exactos, que es justo la parte tediosa de escribir a mano.
 *
 * Cuando entre Supabase, esto se reemplaza por <Turnero />, que ya está hecho
 * y sabe mostrar ocupación de verdad.
 */
export function TurneroConsulta() {
  const [lunesElegido, setLunes] = useState<string | null>(null);
  const [diaElegido, setDiaMovil] = useState<number | null>(null);

  const hoy = new Date();
  const lunesActual = lunesDeLaSemana(hoy);
  const hoyClave = claveFecha(hoy);
  const lunes = lunesElegido ?? lunesActual;
  const diaMovil = diaElegido ?? (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1);

  const jornadas = jornadasDeLaSemana(lunes);
  const offsetSemanas = Math.round(
    (desdeClave(lunes).getTime() - desdeClave(lunesActual).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );

  const mover = (delta: number) => {
    const destino = offsetSemanas + delta;
    if (destino < 0 || destino > SEMANAS_A_FUTURO) return;
    setLunes(sumarDias(lunes, delta * 7));
  };

  const boton =
    "rounded-lg border border-borde bg-carbon px-3 py-2 text-sm text-tenue transition-colors hover:border-bordo-2 hover:text-hueso disabled:opacity-30 disabled:hover:border-borde disabled:hover:text-tenue";

  const estiloSlot = (pasado: boolean) =>
    pasado
      ? "cursor-default border-borde/40 bg-carbon/30 text-tenue/40"
      : "border-borde bg-carbon text-tenue hover:border-bordo-2 hover:bg-bordo/15 hover:text-hueso";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => mover(-1)}
          disabled={offsetSemanas <= 0}
          className={boton}
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">Semana anterior</span>
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-hueso sm:text-base">
            {etiquetaSemana(lunes)}
          </p>
          {offsetSemanas === 0 ? (
            <p className="text-xs text-tenue">Semana actual</p>
          ) : (
            <button
              type="button"
              onClick={() => setLunes(lunesActual)}
              className="text-xs text-marino-2 underline-offset-4 hover:underline"
            >
              Volver a esta semana
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => mover(1)}
          disabled={offsetSemanas >= SEMANAS_A_FUTURO}
          className={boton}
        >
          <span aria-hidden="true">→</span>
          <span className="sr-only">Semana siguiente</span>
        </button>
      </div>

      {/* Celular: un día por vez. */}
      <div className="md:hidden">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {jornadas.map((jornada, i) => {
            const d = desdeClave(jornada);
            return (
              <button
                key={jornada}
                type="button"
                onClick={() => setDiaMovil(i)}
                className={`flex min-w-14 shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                  i === diaMovil
                    ? "border-bordo-2 bg-bordo/25 text-hueso"
                    : "border-borde bg-carbon text-tenue"
                }`}
              >
                <span className="text-[0.7rem] uppercase">{DIAS_CORTOS[d.getDay()]}</span>
                <span className="text-lg font-semibold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        <ul className="flex flex-col gap-2">
          {bloques.map((bloque) => {
            const jornada = jornadas[diaMovil];
            const pasado = yaPaso(jornada, bloque);
            return (
              <li key={bloque}>
                {pasado ? (
                  <div
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 ${estiloSlot(true)}`}
                  >
                    <span className="text-base font-semibold">{rangoBloque(bloque)}</span>
                    <span className="text-sm">Ya pasó</span>
                  </div>
                ) : (
                  <a
                    href={consultaDeTurno(jornada, bloque)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-colors ${estiloSlot(false)}`}
                  >
                    <span className="text-base font-semibold text-hueso">
                      {rangoBloque(bloque)}
                    </span>
                    <span className="text-sm">Consultar →</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Escritorio: la semana entera. */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
          <div />
          {jornadas.map((jornada) => {
            const d = desdeClave(jornada);
            const esHoy = jornada === hoyClave;
            return (
              <div key={jornada} className="pb-1 text-center">
                <div
                  className={`text-xs uppercase ${esHoy ? "text-bordo-2" : "text-tenue"}`}
                >
                  {DIAS_CORTOS[d.getDay()]}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    esHoy
                      ? "mx-auto grid size-8 place-items-center rounded-full bg-bordo text-hueso"
                      : "text-hueso"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}

          {bloques.map((bloque) => (
            <Fila key={bloque} bloque={bloque}>
              {jornadas.map((jornada) => {
                const pasado = yaPaso(jornada, bloque);
                return pasado ? (
                  <div
                    key={jornada}
                    className={`grid min-h-16 place-items-center rounded-lg border px-2 text-xs ${estiloSlot(true)}`}
                  >
                    —
                  </div>
                ) : (
                  <a
                    key={jornada}
                    href={consultaDeTurno(jornada, bloque)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Consultar por el ${rangoBloque(bloque)} de ese día`}
                    className={`grid min-h-16 place-items-center rounded-lg border px-2 text-xs transition-colors ${estiloSlot(false)}`}
                  >
                    Consultar
                  </a>
                );
              })}
            </Fila>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-tenue">
        Cada turno dura 2 horas. Al elegir un horario se abre WhatsApp con el
        mensaje listo — sólo tenés que enviarlo.
      </p>
    </div>
  );
}

function Fila({ bloque, children }: { bloque: number; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-end pr-2">
        <span className="text-sm font-medium text-hueso">{horaInicio(bloque)}</span>
      </div>
      {children}
    </>
  );
}
