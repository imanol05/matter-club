"use client";

import { useState } from "react";

import {
  DIAS_CORTOS,
  SEMANAS_A_FUTURO,
  bloques,
  claveFecha,
  desdeClave,
  esMadrugada,
  etiquetaSemana,
  horaInicio,
  jornadasDeLaSemana,
  lunesDeLaSemana,
  rangoBloque,
  sumarDias,
  yaPaso,
} from "@/lib/horarios";
import { useReservas } from "@/lib/store";
import type { Ocupacion } from "@/lib/tipos";
import { DialogoReserva } from "./DialogoReserva";
import { DialogoEspera } from "./DialogoEspera";

type Modo = "publico" | "encargado";

type EstadoCelda =
  | "libre"
  | "confirmada"
  | "fijo"
  | "pendiente"
  | "bloqueo"
  | "pasado";

function estadoDe(ocupacion: Ocupacion | undefined, pasado: boolean): EstadoCelda {
  if (pasado) return "pasado";
  if (!ocupacion) return "libre";
  if (ocupacion.tipo === "fijo") return "fijo";
  // El público sólo sabe que está tomado; por qué, no le corresponde.
  if (ocupacion.tipo === "ocupado") return "confirmada";
  if (ocupacion.reserva.estado === "confirmada") return "confirmada";
  if (ocupacion.reserva.estado === "pendiente") return "pendiente";
  return "bloqueo";
}

/** El nombre de quien tiene el turno, si es que lo podemos ver. */
function quienLoTiene(ocupacion: Ocupacion | undefined): string | null {
  if (!ocupacion) return null;
  if (ocupacion.tipo === "fijo") return ocupacion.fijo.nombre;
  if (ocupacion.tipo === "reserva") return ocupacion.reserva.nombre;
  return null;
}

/** Lo que ve un visitante: no le importa por qué está tomado, sólo que lo está. */
const ETIQUETA_PUBLICA: Record<EstadoCelda, string> = {
  libre: "Libre",
  confirmada: "Ocupado",
  fijo: "Ocupado",
  pendiente: "A confirmar",
  bloqueo: "No disponible",
  pasado: "—",
};

const ESTILO: Record<EstadoCelda, string> = {
  libre:
    "border-borde bg-carbon text-tenue hover:border-bordo-2 hover:bg-bordo/15 hover:text-hueso",
  confirmada: "border-bordo/40 bg-bordo/20 text-hueso/90",
  fijo: "border-bordo/60 bg-bordo/30 text-hueso/90",
  pendiente: "border-marino-2/50 bg-marino/25 text-hueso/90",
  bloqueo: "rayado border-borde bg-carbon/60 text-tenue",
  pasado: "border-borde/40 bg-carbon/30 text-tenue/40",
};

/** Un horario tomado se puede "pedir igual": ahí entra la lista de espera. */
const SE_PUEDE_ESPERAR: EstadoCelda[] = ["confirmada", "fijo", "pendiente"];

export function Turnero({ modo = "publico" }: { modo?: Modo }) {
  const { listo, ocupacionDe, contarEsperas, bloquear, eliminar } = useReservas();

  // `null` significa "todavía nadie eligió nada", y entonces vale el default
  // que depende de la fecha de hoy. Se resuelve durante el render y no en un
  // efecto: mientras `listo` es false lo que se muestra es el esqueleto, así
  // que el HTML del servidor nunca llega a mencionar una fecha.
  const [lunesElegido, setLunes] = useState<string | null>(null);
  const [diaElegido, setDiaMovil] = useState<number | null>(null);
  const [pidiendo, setPidiendo] = useState<{ jornada: string; bloque: number } | null>(
    null,
  );
  const [esperando, setEsperando] = useState<{
    jornada: string;
    bloque: number;
  } | null>(null);

  const hoy = new Date();
  const lunesActual = lunesDeLaSemana(hoy);
  const hoyClave = claveFecha(hoy);
  const lunes = lunesElegido ?? lunesActual;
  // En el celu arrancamos parados en el día de hoy, no en el lunes.
  const diaMovil = diaElegido ?? (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1);

  const jornadas = jornadasDeLaSemana(lunes);
  const offsetSemanas = Math.round(
    (desdeClave(lunes).getTime() - desdeClave(lunesActual).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );

  if (!listo) return <Esqueleto />;

  const mover = (delta: number) => {
    const destino = offsetSemanas + delta;
    if (destino < 0 || destino > SEMANAS_A_FUTURO) return;
    setLunes(sumarDias(lunes, delta * 7));
  };

  const alTocar = (jornada: string, bloque: number, estado: EstadoCelda) => {
    if (modo === "encargado") {
      const actual = ocupacionDe(jornada, bloque);
      if (estado === "libre") {
        void bloquear(jornada, bloque, "Bloqueado por el encargado");
      } else if (actual?.tipo === "reserva" && actual.reserva.estado === "bloqueo") {
        void eliminar(actual.reserva.id);
      }
      return;
    }
    if (estado === "libre") setPidiendo({ jornada, bloque });
    else if (SE_PUEDE_ESPERAR.includes(estado)) setEsperando({ jornada, bloque });
  };

  const clickeable = (estado: EstadoCelda) => {
    if (estado === "pasado") return false;
    if (modo === "encargado") return estado === "libre" || estado === "bloqueo";
    return estado === "libre" || SE_PUEDE_ESPERAR.includes(estado);
  };

  /** En el panel interesa quién es; en público, sólo si está libre. */
  const textoCelda = (
    estado: EstadoCelda,
    ocupacion: Ocupacion | undefined,
  ): string => {
    if (modo !== "encargado") return ETIQUETA_PUBLICA[estado];
    return quienLoTiene(ocupacion) ?? ETIQUETA_PUBLICA[estado];
  };

  return (
    <div>
      <Controles
        etiqueta={etiquetaSemana(lunes)}
        puedeAtras={offsetSemanas > 0}
        puedeAdelante={offsetSemanas < SEMANAS_A_FUTURO}
        esActual={offsetSemanas === 0}
        onAtras={() => mover(-1)}
        onAdelante={() => mover(1)}
        onHoy={() => setLunes(lunesActual)}
      />

      {/* Celular: un día por vez. Una grilla de 7×8 no entra en 375px. */}
      <div className="md:hidden">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {jornadas.map((jornada, i) => {
            const d = desdeClave(jornada);
            const activo = i === diaMovil;
            return (
              <button
                key={jornada}
                type="button"
                onClick={() => setDiaMovil(i)}
                className={`flex min-w-14 shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                  activo
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
            const ocupacion = ocupacionDe(jornada, bloque);
            const estado = estadoDe(ocupacion, yaPaso(jornada, bloque));
            const enEspera = contarEsperas(jornada, bloque);
            return (
              <li key={bloque}>
                <button
                  type="button"
                  disabled={!clickeable(estado)}
                  onClick={() => alTocar(jornada, bloque, estado)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${ESTILO[estado]} ${
                    clickeable(estado) ? "" : "cursor-default"
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="text-base font-semibold text-hueso">
                      {rangoBloque(bloque)}
                    </span>
                    {esMadrugada(bloque) && (
                      <span className="text-[0.65rem] text-tenue">del día siguiente</span>
                    )}
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-sm">{textoCelda(estado, ocupacion)}</span>
                    {modo === "encargado" && ocupacion?.tipo === "fijo" && (
                      <span className="text-[0.65rem] text-tenue">turno fijo</span>
                    )}
                    {modo === "encargado" && enEspera > 0 && (
                      <span className="text-[0.65rem] text-marino-2">
                        {enEspera} en espera
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Escritorio: la semana entera de un vistazo. */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
          <div />
          {jornadas.map((jornada) => {
            const d = desdeClave(jornada);
            const esHoy = jornada === hoyClave;
            return (
              <div
                key={jornada}
                className="pb-1 text-center"
                aria-current={esHoy ? "date" : undefined}
              >
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
            <FilaBloque key={bloque} bloque={bloque}>
              {jornadas.map((jornada) => {
                const ocupacion = ocupacionDe(jornada, bloque);
                const estado = estadoDe(ocupacion, yaPaso(jornada, bloque));
                const enEspera = contarEsperas(jornada, bloque);
                return (
                  <button
                    key={jornada}
                    type="button"
                    disabled={!clickeable(estado)}
                    onClick={() => alTocar(jornada, bloque, estado)}
                    title={tituloCelda(modo, estado, ocupacion, bloque)}
                    className={`relative min-h-16 rounded-lg border px-2 py-2 text-xs transition-colors ${ESTILO[estado]} ${
                      clickeable(estado) ? "" : "cursor-default"
                    }`}
                  >
                    <span className="line-clamp-2 leading-tight">
                      {textoCelda(estado, ocupacion)}
                    </span>
                    {modo === "encargado" && ocupacion?.tipo === "fijo" && (
                      <span
                        className="absolute top-1 right-1.5 text-[0.6rem] text-hueso/50"
                        aria-label="turno fijo"
                      >
                        ↻
                      </span>
                    )}
                    {modo === "encargado" && enEspera > 0 && (
                      <span className="absolute bottom-1 right-1.5 text-[0.6rem] text-marino-2">
                        +{enEspera}
                      </span>
                    )}
                  </button>
                );
              })}
            </FilaBloque>
          ))}
        </div>
      </div>

      <Referencias modo={modo} />

      {pidiendo && (
        <DialogoReserva
          jornada={pidiendo.jornada}
          bloque={pidiendo.bloque}
          onCerrar={() => setPidiendo(null)}
        />
      )}
      {esperando && (
        <DialogoEspera
          jornada={esperando.jornada}
          bloque={esperando.bloque}
          onCerrar={() => setEsperando(null)}
        />
      )}
    </div>
  );
}

function tituloCelda(
  modo: Modo,
  estado: EstadoCelda,
  ocupacion: Ocupacion | undefined,
  bloque: number,
): string {
  if (modo === "encargado" && ocupacion && ocupacion.tipo !== "ocupado") {
    const esFijo = ocupacion.tipo === "fijo";
    const datos = esFijo ? ocupacion.fijo : ocupacion.reserva;
    const quien = esFijo ? `${datos.nombre} · turno fijo` : datos.nombre;
    return datos.telefono ? `${quien} · ${datos.telefono}` : quien;
  }
  if (SE_PUEDE_ESPERAR.includes(estado)) {
    return `${rangoBloque(bloque)} · ocupado — tocá para anotarte en la lista de espera`;
  }
  return `${rangoBloque(bloque)} · ${ETIQUETA_PUBLICA[estado]}`;
}

function FilaBloque({
  bloque,
  children,
}: {
  bloque: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col justify-center pr-2 text-right">
        <span className="text-sm font-medium text-hueso">{horaInicio(bloque)}</span>
        {esMadrugada(bloque) && <span className="text-[0.6rem] text-tenue">+1 día</span>}
      </div>
      {children}
    </>
  );
}

function Controles({
  etiqueta,
  puedeAtras,
  puedeAdelante,
  esActual,
  onAtras,
  onAdelante,
  onHoy,
}: {
  etiqueta: string;
  puedeAtras: boolean;
  puedeAdelante: boolean;
  esActual: boolean;
  onAtras: () => void;
  onAdelante: () => void;
  onHoy: () => void;
}) {
  const boton =
    "rounded-lg border border-borde bg-carbon px-3 py-2 text-sm text-tenue transition-colors hover:border-bordo-2 hover:text-hueso disabled:opacity-30 disabled:hover:border-borde disabled:hover:text-tenue";
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <button type="button" onClick={onAtras} disabled={!puedeAtras} className={boton}>
        <span aria-hidden="true">←</span>
        <span className="sr-only">Semana anterior</span>
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold text-hueso sm:text-base">{etiqueta}</p>
        {esActual ? (
          <p className="text-xs text-tenue">Semana actual</p>
        ) : (
          <button
            type="button"
            onClick={onHoy}
            className="text-xs text-marino-2 underline-offset-4 hover:underline"
          >
            Volver a esta semana
          </button>
        )}
      </div>

      <button type="button" onClick={onAdelante} disabled={!puedeAdelante} className={boton}>
        <span aria-hidden="true">→</span>
        <span className="sr-only">Semana siguiente</span>
      </button>
    </div>
  );
}

function Referencias({ modo }: { modo: Modo }) {
  const items: Array<[string, string]> = [
    ["border-borde bg-carbon", "Libre"],
    ["border-bordo/40 bg-bordo/20", "Ocupado"],
    ["border-marino-2/50 bg-marino/25", "A confirmar"],
    ["rayado border-borde bg-carbon/60", "No disponible"],
  ];
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tenue">
      {items.map(([clase, texto]) => (
        <span key={texto} className="flex items-center gap-2">
          <span className={`size-3.5 rounded border ${clase}`} />
          {texto}
        </span>
      ))}
      <span className="ml-auto">
        {modo === "encargado"
          ? "Tocá un horario libre para bloquearlo, o uno bloqueado para liberarlo. ↻ = turno fijo."
          : "Cada turno dura 2 horas. Si está ocupado, podés anotarte en la lista de espera."}
      </span>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 h-10 rounded-lg bg-carbon" />
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-carbon" />
        ))}
      </div>
      <span className="sr-only">Cargando los turnos…</span>
    </div>
  );
}
