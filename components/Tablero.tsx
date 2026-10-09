"use client";

/**
 * Tablero de vóley para mostrar en la tele.
 *
 * Está pensado para abrirse en el celu o la compu y mandarse a la tele
 * duplicando pantalla (Chromecast, Smart View, AirPlay o un HDMI): lo que se
 * toca y lo que se ve son la misma página. Por eso todo es grande, horizontal,
 * y los controles quedan abajo de cada equipo sin tapar el marcador.
 *
 * El partido se guarda en el navegador en cada punto: si se recarga la página
 * o se corta el cast, no se pierde el marcador.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Anillo } from "./Marca";
import {
  anotar,
  esDecisivo,
  numeroDeSet,
  partidoNuevo,
  puntosParaSet,
  tienePuntoDePartido,
  tienePuntoDeSet,
  type Equipo,
  type Jugada,
  type Partido,
  type Resultado,
} from "@/lib/tablero";

const CLAVE = "matter:tablero";
const MAX_DESHACER = 200;

type Guardado = { partido: Partido; pila: Partido[] };

function leerGuardado(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Guardado;
      if (g?.partido?.puntos && Array.isArray(g.pila)) return g;
    }
  } catch {
    // Navegación privada o dato roto: arrancamos de cero.
  }
  return { partido: partidoNuevo(), pila: [] };
}

const COLOR: Record<Equipo, { fondo: string; texto: string; borde: string; var: string }> = {
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

const ATAJOS: { tecla: string; accion: string }[] = [
  { tecla: "A / L", accion: "Punto local / visita" },
  { tecla: "Q / P", accion: "Ace local / visita" },
  { tecla: "Z / M", accion: "Monster block local / visita" },
  { tecla: "Retroceso", accion: "Deshacer" },
  { tecla: "F", accion: "Pantalla completa" },
];

const nada = () => () => {};

/**
 * El marcador sale del localStorage, que el servidor no tiene. Para no pelear
 * con la hidratación, el tablero de verdad recién se dibuja en el navegador.
 */
export function Tablero() {
  const enNavegador = useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
  if (!enNavegador) return <div className="h-dvh bg-noche" />;
  return <TableroVivo />;
}

function TableroVivo() {
  const [estado, setEstado] = useState<Guardado>(leerGuardado);
  const [anuncio, setAnuncio] = useState<{ id: number; resultado: Resultado } | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const contador = useRef(0);

  const { partido, pila } = estado;

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin espacio o sin permiso: el tablero sigue andando igual.
    }
  }, [estado]);

  // Que la tele no se apague a mitad de partido. Si el navegador no lo
  // soporta, no pasa nada.
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

  // Los festejos se van solos; el de fin de partido se queda hasta que alguien
  // arranque otro o deshaga.
  useEffect(() => {
    if (!anuncio || anuncio.resultado.tipo === "partido") return;
    const ms = anuncio.resultado.tipo === "set" ? 4200 : 2200;
    const t = setTimeout(() => setAnuncio(null), ms);
    return () => clearTimeout(t);
  }, [anuncio]);

  const sacudir = useCallback((fuerte: boolean) => {
    const d = fuerte ? 18 : 8;
    raiz.current?.animate(
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
  }, []);

  const jugar = useCallback(
    (equipo: Equipo, jugada: Jugada) => {
      const r = anotar(partido, equipo, jugada);
      if (!r) return;
      setEstado({ partido: r.partido, pila: [...pila, partido].slice(-MAX_DESHACER) });
      if (jugada !== "punto" || r.resultado.tipo !== "jugada") {
        contador.current += 1;
        setAnuncio({ id: contador.current, resultado: r.resultado });
      } else {
        setAnuncio(null);
      }
      if (jugada === "bloqueo") sacudir(true);
      else if (jugada === "ace") sacudir(false);
    },
    [partido, pila, sacudir],
  );

  const deshacer = useCallback(() => {
    if (pila.length === 0) return;
    setEstado({ partido: pila[pila.length - 1], pila: pila.slice(0, -1) });
    setAnuncio(null);
  }, [pila]);

  const cambiar = useCallback(
    (cambio: Partial<Partido>) =>
      setEstado((e) => ({ ...e, partido: { ...e.partido, ...cambio } })),
    [],
  );

  const nuevoPartido = useCallback(() => {
    setEstado((e) => ({ partido: partidoNuevo(e.partido), pila: [] }));
    setAnuncio(null);
  }, []);

  useEffect(() => {
    if (ajustes) return;
    const tecla = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const acciones: Record<string, () => void> = {
        a: () => jugar("local", "punto"),
        q: () => jugar("local", "ace"),
        z: () => jugar("local", "bloqueo"),
        l: () => jugar("visita", "punto"),
        p: () => jugar("visita", "ace"),
        m: () => jugar("visita", "bloqueo"),
        backspace: deshacer,
        f: pantallaCompleta,
      };
      const accion = acciones[ev.key.toLowerCase()];
      if (accion) {
        ev.preventDefault();
        accion();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ajustes, jugar, deshacer]);

  const orden: Equipo[] = partido.invertido ? ["visita", "local"] : ["local", "visita"];

  return (
    <div
      ref={raiz}
      className="fondo-halos relative flex h-dvh flex-col overflow-hidden bg-noche select-none"
    >
      <Cabecera partido={partido} onAjustes={() => setAjustes(true)} />

      <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 px-3 sm:gap-6 sm:px-6">
        {orden.map((e) => (
          <Mitad key={e} partido={partido} equipo={e} onJugar={jugar} />
        ))}
      </main>

      <Pie
        partido={partido}
        puedeDeshacer={pila.length > 0}
        onDeshacer={deshacer}
        onCambiarLados={() => cambiar({ invertido: !partido.invertido })}
      />

      {anuncio && (
        <Anuncio
          key={anuncio.id}
          resultado={anuncio.resultado}
          partido={partido}
          onNuevo={nuevoPartido}
          onDeshacer={deshacer}
        />
      )}

      {ajustes && (
        <Ajustes
          partido={partido}
          onCambiar={cambiar}
          onNuevo={() => {
            nuevoPartido();
            setAjustes(false);
          }}
          onCerrar={() => setAjustes(false)}
        />
      )}
    </div>
  );
}

function pantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/* ───────────────────────────── Partes fijas ───────────────────────────── */

function Cabecera({ partido, onAjustes }: { partido: Partido; onAjustes: () => void }) {
  const set = numeroDeSet(partido);
  const terminado = partido.ganador !== null;

  return (
    <header className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
      <div className="flex items-center gap-2.5">
        <Anillo className="size-9 sm:size-11" />
        <span className="text-sm font-semibold tracking-wide text-hueso sm:text-base">
          Matter
        </span>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold tracking-[0.25em] text-hueso uppercase sm:text-2xl">
          {terminado ? "Final" : esDecisivo(partido) ? "Tie-break" : `Set ${set}`}
        </p>
        <p className="text-[0.65rem] tracking-[0.3em] text-tenue uppercase sm:text-xs">
          Al mejor de {partido.setsParaGanar * 2 - 1} · a {puntosParaSet(partido)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <BotonIcono etiqueta="Pantalla completa" onClick={pantallaCompleta}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </BotonIcono>
        <BotonIcono etiqueta="Ajustes" onClick={onAjustes}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </BotonIcono>
      </div>
    </header>
  );
}

function BotonIcono({
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

function Mitad({
  partido,
  equipo,
  onJugar,
}: {
  partido: Partido;
  equipo: Equipo;
  onJugar: (e: Equipo, j: Jugada) => void;
}) {
  const c = COLOR[equipo];
  const saca = partido.saque === equipo;
  const partidoPoint = tienePuntoDePartido(partido, equipo);
  const setPoint = !partidoPoint && tienePuntoDeSet(partido, equipo);
  const gano = partido.ganador === equipo;
  const terminado = partido.ganador !== null;

  return (
    <section className="flex min-h-0 flex-col gap-2 sm:gap-3">
      <button
        type="button"
        disabled={terminado}
        onClick={() => onJugar(equipo, "punto")}
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
      </button>

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
    </section>
  );
}

function Pie({
  partido,
  puedeDeshacer,
  onDeshacer,
  onCambiarLados,
}: {
  partido: Partido;
  puedeDeshacer: boolean;
  onDeshacer: () => void;
  onCambiarLados: () => void;
}) {
  const izq: Equipo = partido.invertido ? "visita" : "local";
  const der: Equipo = partido.invertido ? "local" : "visita";

  return (
    <footer className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
      <button
        type="button"
        onClick={onDeshacer}
        disabled={!puedeDeshacer}
        className="rounded-xl border border-borde px-3 py-2 text-sm text-tenue transition-colors hover:text-hueso disabled:opacity-30"
      >
        ↶ Deshacer
      </button>

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

      <button
        type="button"
        onClick={onCambiarLados}
        className="rounded-xl border border-borde px-3 py-2 text-sm text-tenue transition-colors hover:text-hueso"
      >
        ⇄ Cambiar lados
      </button>
    </footer>
  );
}

function Pelota({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c-1 4 0 8 3.5 10.5M3.5 7.5c4 .5 7.5 2.5 8.5 4.5M5 19c2-3.5 5-6 7-7M20.5 8c-3 2.5-5 4-8.5 4M12 12c1 3.5 3.5 6.5 7 8" />
    </svg>
  );
}

/* ─────────────────────────────── Festejos ─────────────────────────────── */

function Anuncio({
  resultado,
  partido,
  onNuevo,
  onDeshacer,
}: {
  resultado: Resultado;
  partido: Partido;
  onNuevo: () => void;
  onDeshacer: () => void;
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
        <p className={`tablero-sube text-2xl font-black tracking-[0.4em] uppercase sm:text-4xl ${c.texto}`}>
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

/* ─────────────────────────────── Ajustes ─────────────────────────────── */

function Ajustes({
  partido,
  onCambiar,
  onNuevo,
  onCerrar,
}: {
  partido: Partido;
  onCambiar: (c: Partial<Partido>) => void;
  onNuevo: () => void;
  onCerrar: () => void;
}) {
  const empezado = partido.jugados.length > 0 || partido.puntos.local + partido.puntos.visita > 0;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-noche/80 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ajustes"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-borde bg-carbon p-5 select-text sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="titulo-ajustes" className="text-xl font-semibold text-hueso">
            Ajustes del partido
          </h2>
          <button type="button" onClick={onCerrar} className="text-tenue hover:text-hueso">
            Cerrar
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["local", "visita"] as const).map((e) => (
            <label key={e} className="grid gap-1.5 text-sm text-tenue">
              Equipo {e}
              <input
                value={partido.nombres[e]}
                maxLength={20}
                onChange={(ev) =>
                  onCambiar({ nombres: { ...partido.nombres, [e]: ev.target.value } })
                }
                className={`rounded-lg border-2 bg-noche px-3 py-2 text-base text-hueso outline-none ${COLOR[e].borde}`}
              />
            </label>
          ))}
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm text-tenue">Formato</legend>
          <div className="flex gap-2">
            {([2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={empezado}
                onClick={() => onCambiar({ setsParaGanar: n })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${
                  partido.setsParaGanar === n
                    ? "border-hueso bg-carbon-2 text-hueso"
                    : "border-borde text-tenue"
                }`}
              >
                Al mejor de {n * 2 - 1}
              </button>
            ))}
          </div>
          {empezado && (
            <p className="mt-2 text-xs text-tenue">
              El formato se elige antes de empezar. Para cambiarlo, arrancá un partido nuevo.
            </p>
          )}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm text-tenue">¿Quién saca?</legend>
          <div className="flex gap-2">
            {(["local", "visita"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onCambiar({ saque: e })}
                className={`flex-1 truncate rounded-lg border px-3 py-2 text-sm ${
                  partido.saque === e
                    ? `${COLOR[e].borde} bg-carbon-2 text-hueso`
                    : "border-borde text-tenue"
                }`}
              >
                {partido.nombres[e]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <p className="mb-2 text-sm text-tenue">Atajos de teclado</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {ATAJOS.map((a) => (
              <div key={a.tecla} className="contents">
                <dt className="font-mono text-hueso">{a.tecla}</dt>
                <dd className="text-tenue">{a.accion}</dd>
              </div>
            ))}
          </dl>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!empezado || confirm("¿Arrancar un partido nuevo? Se pierde el marcador actual.")) {
              onNuevo();
            }
          }}
          className="mt-6 w-full rounded-xl bg-bordo py-3 font-semibold text-hueso transition-colors hover:bg-bordo-2"
        >
          Nuevo partido
        </button>
      </div>
    </div>
  );
}
