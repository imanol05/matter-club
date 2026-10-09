"use client";

/**
 * Las piezas que se ven del tablero de vóley: tarjetas de los equipos,
 * cabecera, pie y festejos.
 *
 * Las usan las dos pantallas: el control (`Tablero`, en el celu) y la tele
 * (`TableroTele`). Las dos tienen que verse igual, así que el dibujo vive acá y
 * cada una le pasa sólo lo que puede hacer: el control pasa acciones, la tele no.
 */

import { useEffect, useSyncExternalStore } from "react";

import { Anillo } from "./Marca";
import {
  esDecisivo,
  numeroDeSet,
  puntosParaSet,
  tienePuntoDePartido,
  tienePuntoDeSet,
  type Equipo,
  type Jugada,
  type Partido,
  type Resultado,
} from "@/lib/tablero";

export type AnuncioActivo = { id: number; resultado: Resultado };

/** Cuánto dura cada festejo en pantalla. El de fin de partido no se va solo. */
export function duracionAnuncio(r: Resultado): number | null {
  if (r.tipo === "partido") return null;
  return r.tipo === "set" ? 4200 : 2200;
}

export const COLOR: Record<Equipo, { fondo: string; texto: string; borde: string; var: string }> = {
  local: {
    fondo: "bg-bordo",
    texto: "text-bordo-2",
    borde: "border-bordo-2",
    var: "var(--color-bordo-2)",
  },
  visita: {
    fondo: "bg-marino-2",
    texto: "text-marino-2",
    borde: "border-marino-2",
    var: "var(--color-marino-2)",
  },
};
const nada = () => () => {};

/**
 * true recién en el navegador. El tablero sale de cosas que el servidor no
 * tiene (localStorage, el código de la tele), así que se dibuja recién ahí para
 * no pelear con la hidratación.
 */
export function useEnNavegador() {
  return useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
}

/** Que la pantalla no se apague a mitad de partido. Si el navegador no puede, no pasa nada. */
export function useSinApagar() {
  useEffect(() => {
    let candado: WakeLockSentinel | null = null;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        ?.request("screen")
        .then((c) => (candado = c))
        .catch(() => {});
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      candado?.release().catch(() => {});
    };
  }, []);
}

/** Temblor de pantalla para el ace (suave) y el monster block (fuerte). */
export function sacudir(el: HTMLElement | null, jugada: Jugada) {
  if (!el || jugada === "punto") return;
  const fuerte = jugada === "bloqueo";
  const d = fuerte ? 18 : 8;
  el.animate(
    [
      { transform: "translate(0, 0)" },
      { transform: `translate(${-d}px, ${d / 2}px)` },
      { transform: `translate(${d}px, ${-d / 2}px)` },
      { transform: `translate(${-d / 2}px, ${d}px)` },
      { transform: `translate(${d / 2}px, 0)` },
      { transform: "translate(0, 0)" },
    ],
    { duration: fuerte ? 520 : 360, easing: "ease-out" },
  );
}

export function pantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/* ───────────────────────────── Partes fijas ───────────────────────────── */

/** Arriba: el club, el set en juego y, a la derecha, lo que cada pantalla quiera poner. */
export function Cabecera({ partido, children }: { partido: Partido; children?: React.ReactNode }) {
  const set = numeroDeSet(partido);
  const terminado = partido.ganador !== null;

  return (
    <header className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
      <div className="flex items-center gap-2.5">
        <Anillo className="size-9 sm:size-11" />
        <span className="hidden text-sm font-semibold tracking-wide text-hueso min-[420px]:inline sm:text-base">
          Matter
        </span>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold tracking-[0.25em] text-hueso uppercase sm:text-2xl">
          {terminado ? "Final" : esDecisivo(partido) ? "Tie-break" : `Set ${set}`}
        </p>
        <p className="text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-tenue uppercase sm:text-xs sm:tracking-[0.3em]">
          Al mejor de {partido.setsParaGanar * 2 - 1} · a {puntosParaSet(partido)}
        </p>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">{children}</div>
    </header>
  );
}

export function BotonIcono({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      className="rounded-lg p-2 text-tenue transition-colors hover:bg-carbon-2 hover:text-hueso"
    >
      <span className="sr-only">{etiqueta}</span>
      <svg
        viewBox="0 0 24 24"
        className="size-5 sm:size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

/**
 * La tarjeta de un equipo. Sin `onJugar` es sólo para mirar: así la usa la
 * tele, que no tiene nada que tocar.
 */
export function Mitad({
  partido,
  equipo,
  onJugar,
}: {
  partido: Partido;
  equipo: Equipo;
  onJugar?: (e: Equipo, j: Jugada) => void;
}) {
  const c = COLOR[equipo];
  const saca = partido.saque === equipo;
  const partidoPoint = tienePuntoDePartido(partido, equipo);
  const setPoint = !partidoPoint && tienePuntoDeSet(partido, equipo);
  const gano = partido.ganador === equipo;
  const terminado = partido.ganador !== null;

  return (
    <section className="flex min-h-0 flex-col gap-2 sm:gap-3">
      <Tarjeta
        onClick={onJugar && !terminado ? () => onJugar(equipo, "punto") : undefined}
        className={`group relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-2 bg-carbon/80 p-3 [@media(max-height:500px)]:p-2 transition-transform active:scale-[0.98] sm:p-5 ${
          saca ? c.borde : "border-borde"
        } ${gano ? "tablero-ganador" : ""}`}
        style={{ "--equipo": c.var } as React.CSSProperties}
      >
        <span className={`absolute inset-x-0 top-0 h-1.5 ${c.fondo}`} />

        <div className="flex w-full items-center justify-between gap-2">
          <h2 className="truncate text-xl font-bold tracking-wide text-hueso uppercase sm:text-4xl [@media(max-height:500px)]:text-lg">
            {partido.nombres[equipo]}
          </h2>
          <span
            className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-widest uppercase transition-opacity sm:text-sm ${c.texto} ${
              saca ? "opacity-100" : "opacity-0"
            }`}
          >
            <Pelota className="tablero-saque size-5 sm:size-7" />
            Saque
          </span>
        </div>

        {/* El número se mide contra el lugar que le queda, no contra la
            pantalla: así entra igual en la tele que en un celu acostado. */}
        <span className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
          <span
            key={partido.puntos[equipo]}
            className="tablero-pop text-[min(92cqh,52cqw)] leading-none font-black text-hueso tabular-nums"
          >
            {partido.puntos[equipo]}
          </span>
        </span>

        <div className="flex w-full items-center justify-between">
          <div className="flex gap-1.5" aria-label={`${partido.sets[equipo]} sets ganados`}>
            {Array.from({ length: partido.setsParaGanar }, (_, i) => (
              <span
                key={i}
                className={`size-3 rounded-full border-2 sm:size-4 ${c.borde} ${
                  i < partido.sets[equipo] ? c.fondo : ""
                }`}
              />
            ))}
          </div>
          {(setPoint || partidoPoint) && (
            <span
              className={`tablero-latido rounded-full px-3 py-1 text-xs font-black tracking-widest text-hueso uppercase sm:text-sm ${c.fondo}`}
            >
              {partidoPoint ? "Match point" : "Set point"}
            </span>
          )}
        </div>
      </Tarjeta>

      {onJugar && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            disabled={terminado}
            onClick={() => onJugar(equipo, "ace")}
            className="rounded-2xl border border-borde bg-carbon-2 py-2 text-base font-black tracking-[0.2em] text-hueso uppercase transition hover:border-hueso/40 active:scale-95 disabled:opacity-40 sm:py-3 sm:text-xl [@media(max-height:500px)]:py-1.5 [@media(max-height:500px)]:text-sm"
          >
            Ace
          </button>
          <button
            type="button"
            disabled={terminado}
            onClick={() => onJugar(equipo, "bloqueo")}
            className="rounded-2xl border border-borde bg-carbon-2 py-2 text-sm font-black tracking-[0.12em] whitespace-nowrap text-hueso uppercase transition hover:border-hueso/40 active:scale-95 disabled:opacity-40 sm:py-3 sm:text-xl [@media(max-height:500px)]:py-1.5 [@media(max-height:500px)]:text-sm"
          >
            Monster block
          </button>
        </div>
      )}
    </section>
  );
}

/** Botón si hay algo que hacer al tocarla; si no, una caja quieta. */
function Tarjeta({
  onClick,
  className,
  style,
  children,
}: {
  onClick?: () => void;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (!onClick) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}

/** Abajo: los sets ya jugados y, si se pasan, los controles de corrección. */
export function Pie({
  partido,
  puedeDeshacer = false,
  onDeshacer,
  onCambiarLados,
}: {
  partido: Partido;
  puedeDeshacer?: boolean;
  onDeshacer?: () => void;
  onCambiarLados?: () => void;
}) {
  const izq: Equipo = partido.invertido ? "visita" : "local";
  const der: Equipo = partido.invertido ? "local" : "visita";

  return (
    // Los botones van juntos a la izquierda: la esquina de abajo a la derecha
    // queda libre porque ahí el navegador o el hosting a veces ponen un cartel
    // propio que tapaba "Cambiar lados".
    <footer
      className={`flex min-h-12 items-center gap-3 px-3 py-2 sm:px-6 sm:py-3 ${
        onDeshacer ? "justify-start" : "justify-center"
      }`}
    >
      {onDeshacer && (
        <button
          type="button"
          onClick={onDeshacer}
          disabled={!puedeDeshacer}
          className="shrink-0 rounded-xl border border-borde px-3 py-2 text-sm text-tenue transition-colors hover:text-hueso disabled:opacity-30"
        >
          ↶ Deshacer
        </button>
      )}

      {onCambiarLados && (
        <button
          type="button"
          onClick={onCambiarLados}
          className="shrink-0 rounded-xl border border-borde px-3 py-2 text-sm text-tenue transition-colors hover:text-hueso"
        >
          ⇄ Cambiar lados
        </button>
      )}

      <ol className="flex flex-wrap justify-center gap-2 text-sm tabular-nums sm:text-base">
        {partido.jugados.map((s, i) => {
          const ganoIzq = s[izq] > s[der];
          return (
            <li key={i} className="rounded-lg bg-carbon-2 px-2.5 py-1 text-tenue">
              <span className={ganoIzq ? "font-bold text-hueso" : ""}>{s[izq]}</span>
              <span className="mx-1">–</span>
              <span className={!ganoIzq ? "font-bold text-hueso" : ""}>{s[der]}</span>
            </li>
          );
        })}
      </ol>
    </footer>
  );
}

export function Pelota({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c-1 4 0 8 3.5 10.5M3.5 7.5c4 .5 7.5 2.5 8.5 4.5M5 19c2-3.5 5-6 7-7M20.5 8c-3 2.5-5 4-8.5 4M12 12c1 3.5 3.5 6.5 7 8" />
    </svg>
  );
}

/* ─────────────────────────────── Festejos ─────────────────────────────── */

/**
 * El festejo que tapa la pantalla. El de fin de partido trae botones sólo si se
 * pasan las acciones: en la tele no hay nada que apretar.
 */
export function Anuncio({
  resultado,
  partido,
  onNuevo,
  onDeshacer,
}: {
  resultado: Resultado;
  partido: Partido;
  onNuevo?: () => void;
  onDeshacer?: () => void;
}) {
  const c = COLOR[resultado.equipo];
  const nombre = partido.nombres[resultado.equipo];
  const estilo = { "--equipo": c.var } as React.CSSProperties;

  if (resultado.tipo === "partido") {
    return (
      <div
        className="tablero-velo absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-noche/85 p-6 text-center backdrop-blur-sm"
        style={estilo}
      >
        <Papelitos />
        <p className="tablero-sube text-sm font-semibold tracking-[0.5em] text-tenue uppercase sm:text-xl">
          Ganó el partido
        </p>
        <h2 className="tablero-golpe text-[min(16vh,14vw)] leading-none font-black text-hueso uppercase drop-shadow-[0_0_40px_var(--equipo)]">
          {nombre}
        </h2>
        <p className={`tablero-sube text-4xl font-black tabular-nums sm:text-6xl ${c.texto}`}>
          {partido.sets.local} – {partido.sets.visita}
        </p>
        {onNuevo && onDeshacer && (
          <div className="tablero-sube flex gap-3">
            <button
              type="button"
              onClick={onDeshacer}
              className="rounded-xl border border-borde px-4 py-2 text-tenue hover:text-hueso"
            >
              Deshacer último punto
            </button>
            <button
              type="button"
              onClick={onNuevo}
              className={`rounded-xl px-5 py-2 font-semibold text-hueso ${c.fondo}`}
            >
              Nuevo partido
            </button>
          </div>
        )}
      </div>
    );
  }

  if (resultado.tipo === "set") {
    return (
      <div
        className="tablero-velo pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-noche/75 text-center backdrop-blur-sm"
        style={estilo}
      >
        <Papelitos />
        <p
          className={`tablero-sube text-2xl font-black tracking-[0.4em] uppercase sm:text-4xl ${c.texto}`}
        >
          Set para
        </p>
        <h2 className="tablero-golpe text-[min(18vh,14vw)] leading-none font-black text-hueso uppercase drop-shadow-[0_0_40px_var(--equipo)]">
          {nombre}
        </h2>
        <p className="tablero-sube text-4xl font-bold text-hueso tabular-nums sm:text-6xl">
          {resultado.set.local} – {resultado.set.visita}
        </p>
      </div>
    );
  }

  if (resultado.jugada === "ace") {
    return (
      <div
        className="tablero-velo pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
        style={estilo}
      >
        <div className="tablero-destello absolute inset-0" />
        <div className="tablero-estela absolute top-1/2 h-[30vh] w-[160vw] -translate-y-1/2" />
        <Pelota className="tablero-pelota-ace absolute top-1/2 size-[18vh] -translate-y-1/2 text-hueso" />
        <div className="relative text-center">
          <h2 className="tablero-ace text-[min(42vh,34vw)] leading-none font-black text-hueso italic drop-shadow-[0_0_50px_var(--equipo)]">
            ACE
          </h2>
          <p className="tablero-sube text-xl font-bold tracking-[0.4em] text-hueso/90 uppercase sm:text-3xl">
            {nombre}
          </p>
        </div>
      </div>
    );
  }

  if (resultado.jugada === "bloqueo") {
    return (
      <div
        className="tablero-velo pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
        style={estilo}
      >
        <div className="tablero-destello absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 flex h-[45vh] opacity-70 items-end justify-center gap-[3vw]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="tablero-pared w-[9vw] rounded-t-[4vw] border-4 border-hueso/30"
              style={{ animationDelay: `${i * 60}ms`, height: `${70 + (i % 2) * 15}%` }}
            />
          ))}
        </div>
        <div className="relative text-center leading-[0.85]">
          <h2 className="tablero-monstruo text-[min(24vh,17vw)] font-black text-hueso uppercase drop-shadow-[0_0_50px_var(--equipo)]">
            Monster
          </h2>
          <h2 className="tablero-bloque text-[min(24vh,17vw)] font-black text-hueso uppercase drop-shadow-[0_0_50px_var(--equipo)]">
            Block
          </h2>
          <p className="tablero-sube mt-3 text-xl font-bold tracking-[0.4em] text-hueso uppercase drop-shadow-[0_2px_12px_black] sm:text-3xl">
            {nombre}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Papel picado. Las posiciones salen del índice y no de Math.random para que
 * el dibujo sea el mismo en cada render.
 */
function Papelitos() {
  const colores = ["var(--equipo)", "var(--color-hueso)", "#f5c542", "var(--equipo)"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 70 }, (_, i) => {
        const x = (i * 37) % 100;
        const retraso = ((i * 13) % 20) / 10;
        const duracion = 2.4 + ((i * 7) % 10) / 5;
        const giro = (i * 53) % 360;
        return (
          <span
            key={i}
            className="tablero-papel absolute -top-6 block h-4 w-2.5 rounded-[2px]"
            style={
              {
                left: `${x}%`,
                background: colores[i % colores.length],
                animationDelay: `${retraso}s`,
                animationDuration: `${duracion}s`,
                "--giro": `${giro}deg`,
                "--deriva": `${((i % 9) - 4) * 4}vw`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
