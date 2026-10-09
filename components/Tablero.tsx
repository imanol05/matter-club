"use client";

/**
 * El control del tablero de vóley: la pantalla donde se anotan los puntos.
 *
 * Sirve de dos maneras:
 *
 * - Sola, duplicando la pantalla del celu o la compu en la tele (Chromecast,
 *   Smart View, AirPlay, HDMI). Lo que se toca y lo que se ve son lo mismo.
 * - Enlazada a una tele que abre /tablero/tele: el celu queda de control y la
 *   tele muestra sólo el marcador, sin botones. Ver lib/enlace.ts.
 *
 * El partido se guarda en el navegador en cada punto: si se recarga la página,
 * no se pierde el marcador. El celu es el dueño del partido; la tele no guarda
 * nada y se pone al día cada vez que se conecta.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Anuncio,
  BotonIcono,
  COLOR,
  Cabecera,
  Mitad,
  Pie,
  duracionAnuncio,
  pantallaCompleta,
  sacudir,
  useEnNavegador,
  useSinApagar,
  type AnuncioActivo,
} from "./MarcadorVoley";
import {
  CADA_CUANTO_SALUDA_MS,
  LARGO_CODIGO,
  abrirEnlace,
  codigoValido,
  normalizarCodigo,
  type Enlace,
  type MensajeTablero,
} from "@/lib/enlace";
import { anotar, partidoNuevo, type Equipo, type Jugada, type Partido } from "@/lib/tablero";

const CLAVE = "matter:tablero";
const MAX_DESHACER = 200;

/** Si la tele no saluda en este tiempo, se la da por desconectada. */
const TELE_PERDIDA_MS = CADA_CUANTO_SALUDA_MS * 3;

type Guardado = {
  partido: Partido;
  pila: Partido[];
  /** Código de la tele enlazada, si hay una. */
  tele: string | null;
};

function leerGuardado(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Guardado;
      if (g?.partido?.puntos && Array.isArray(g.pila)) {
        return { ...g, tele: codigoValido(g.tele ?? "") ? g.tele : null };
      }
    }
  } catch {
    // Navegación privada o dato roto: arrancamos de cero.
  }
  return { partido: partidoNuevo(), pila: [], tele: null };
}

const ATAJOS: { tecla: string; accion: string }[] = [
  { tecla: "A / L", accion: "Punto local / visita" },
  { tecla: "Q / P", accion: "Ace local / visita" },
  { tecla: "Z / M", accion: "Monster block local / visita" },
  { tecla: "Retroceso", accion: "Deshacer" },
  { tecla: "F", accion: "Pantalla completa" },
];

export function Tablero() {
  if (!useEnNavegador()) return <div className="h-dvh bg-noche" />;
  return <TableroVivo />;
}

function TableroVivo() {
  const [estado, setEstado] = useState<Guardado>(leerGuardado);
  const [anuncio, setAnuncio] = useState<AnuncioActivo | null>(null);
  const [dialogo, setDialogo] = useState<"ajustes" | "tele" | null>(null);
  const [teleVista, setTeleVista] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const enlace = useRef<Enlace | null>(null);
  const ultimo = useRef<{ partido: Partido; anuncio: AnuncioActivo | null }>(null);

  const { partido, pila, tele } = estado;

  useSinApagar();

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin espacio o sin permiso: el tablero sigue andando igual.
    }
  }, [estado]);

  // Los festejos se van solos; el de fin de partido se queda hasta que alguien
  // arranque otro o deshaga.
  useEffect(() => {
    if (!anuncio) return;
    const ms = duracionAnuncio(anuncio.resultado);
    if (ms === null) return;
    const t = setTimeout(() => setAnuncio(null), ms);
    return () => clearTimeout(t);
  }, [anuncio]);

  // ── Enlace con la tele ──────────────────────────────────────────────────

  useEffect(() => {
    ultimo.current = { partido, anuncio };
  }, [partido, anuncio]);

  useEffect(() => {
    if (!tele) return;

    /**
     * A una tele que recién llega se le manda el partido, pero no un ace de
     * hace un rato: sólo el cartel de fin de partido, que es el que se queda.
     */
    const responder = () => {
      const u = ultimo.current;
      if (!u) return;
      enlace.current?.enviar({
        tipo: "estado",
        motivo: "respuesta",
        partido: u.partido,
        anuncio: u.anuncio?.resultado.tipo === "partido" ? u.anuncio : null,
      });
    };
    const recibir = (m: MensajeTablero) => {
      if (m.tipo !== "hola") return;
      const t = Date.now();
      setTeleVista(t);
      setAhora(t);
      responder();
    };

    // Al conectarse, el celu manda el partido y pregunta si hay teles: las que
    // estén saludan, y así se sabe en el acto que hay una mirando.
    enlace.current = abrirEnlace(tele, recibir, () => {
      responder();
      enlace.current?.enviar({ tipo: "llamado" });
    });
    return () => {
      enlace.current?.cerrar();
      enlace.current = null;
      setTeleVista(null);
    };
  }, [tele]);

  // Cada punto sale para la tele en el momento.
  useEffect(() => {
    enlace.current?.enviar({ tipo: "estado", motivo: "cambio", partido, anuncio });
  }, [partido, anuncio]);

  useEffect(() => {
    if (!tele) return;
    const t = setInterval(() => setAhora(Date.now()), 3000);
    return () => clearInterval(t);
  }, [tele]);

  const teleConectada = teleVista !== null && ahora - teleVista < TELE_PERDIDA_MS;

  // ── Acciones ───────────────────────────────────────────────────────────

  const jugar = useCallback(
    (equipo: Equipo, jugada: Jugada) => {
      const r = anotar(partido, equipo, jugada);
      if (!r) return;
      setEstado((e) => ({
        ...e,
        partido: r.partido,
        pila: [...e.pila, e.partido].slice(-MAX_DESHACER),
      }));
      // Un punto común no tiene festejo; todo lo demás sí. El id sale del
      // reloj para que no se repita aunque se recargue la página.
      const festeja = jugada !== "punto" || r.resultado.tipo !== "jugada";
      setAnuncio(festeja ? { id: Date.now(), resultado: r.resultado } : null);
      sacudir(raiz.current, jugada);
    },
    [partido],
  );

  const deshacer = useCallback(() => {
    if (pila.length === 0) return;
    setEstado((e) => ({ ...e, partido: pila[pila.length - 1], pila: pila.slice(0, -1) }));
    setAnuncio(null);
  }, [pila]);

  const cambiar = useCallback(
    (cambio: Partial<Partido>) =>
      setEstado((e) => ({ ...e, partido: { ...e.partido, ...cambio } })),
    [],
  );

  const nuevoPartido = useCallback(() => {
    setEstado((e) => ({ ...e, partido: partidoNuevo(e.partido), pila: [] }));
    setAnuncio(null);
  }, []);

  const enlazar = useCallback((codigo: string | null) => {
    setEstado((e) => ({ ...e, tele: codigo }));
  }, []);

  useEffect(() => {
    if (dialogo) return;
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
  }, [dialogo, jugar, deshacer]);

  const orden: Equipo[] = partido.invertido ? ["visita", "local"] : ["local", "visita"];

  return (
    <div
      ref={raiz}
      className="fondo-halos relative flex h-dvh flex-col overflow-hidden bg-noche select-none"
    >
      <Cabecera partido={partido}>
        <button
          type="button"
          onClick={() => setDialogo("tele")}
          title="Conectar una tele"
          className="flex items-center gap-1.5 rounded-lg p-2 text-sm text-tenue transition-colors hover:bg-carbon-2 hover:text-hueso"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5 sm:size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span className="hidden sm:inline">Tele</span>
          {tele && (
            <span
              className={`size-2.5 rounded-full ${teleConectada ? "bg-emerald-400" : "bg-bordo-2"}`}
            />
          )}
        </button>
        <BotonIcono etiqueta="Pantalla completa" onClick={pantallaCompleta}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </BotonIcono>
        <BotonIcono etiqueta="Ajustes" onClick={() => setDialogo("ajustes")}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </BotonIcono>
      </Cabecera>

      {/* Con el celu parado, un equipo arriba del otro: lado a lado no entran
          los botones. */}
      <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 px-3 sm:gap-6 sm:px-6 portrait:grid-cols-1 portrait:grid-rows-2">
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

      {dialogo === "ajustes" && (
        <Ajustes
          partido={partido}
          onCambiar={cambiar}
          onNuevo={() => {
            nuevoPartido();
            setDialogo(null);
          }}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo === "tele" && (
        <DialogoTele
          tele={tele}
          conectada={teleConectada}
          onEnlazar={enlazar}
          onCerrar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────── Diálogos ─────────────────────────────── */

function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-noche/80 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-borde bg-carbon p-5 select-text sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-hueso">{titulo}</h2>
          <button type="button" onClick={onCerrar} className="text-tenue hover:text-hueso">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogoTele({
  tele,
  conectada,
  onEnlazar,
  onCerrar,
}: {
  tele: string | null;
  conectada: boolean;
  onEnlazar: (codigo: string | null) => void;
  onCerrar: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const direccion = `${window.location.host}/tablero/tele`;

  if (tele) {
    return (
      <Modal titulo="Tele" onCerrar={onCerrar}>
        <div className="flex items-center gap-3 rounded-xl border border-borde bg-noche p-4">
          <span
            className={`size-3 shrink-0 rounded-full ${conectada ? "bg-emerald-400" : "tablero-latido bg-bordo-2"}`}
          />
          <div>
            <p className="font-mono text-2xl tracking-[0.3em] text-hueso">{tele}</p>
            <p className="text-sm text-tenue">
              {conectada
                ? "Conectada: lo que anotes acá aparece en la tele."
                : "Esperando a la tele… Fijate que tenga abierto el tablero y este mismo código."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEnlazar(null)}
          className="mt-5 w-full rounded-xl border border-borde py-3 text-tenue transition-colors hover:text-hueso"
        >
          Desconectar esta tele
        </button>
      </Modal>
    );
  }

  const listo = codigoValido(codigo);

  return (
    <Modal titulo="Conectar una tele" onCerrar={onCerrar}>
      <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-tenue">
        <li>
          En el navegador de la tele abrí{" "}
          <span className="font-semibold text-hueso">{direccion}</span>
        </li>
        <li>Va a mostrar un código de {LARGO_CODIGO} letras. Escribilo acá.</li>
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (listo) {
            onEnlazar(codigo);
            onCerrar();
          }
        }}
        className="flex gap-2"
      >
        <input
          value={codigo}
          onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABCD"
          aria-label="Código de la tele"
          className="min-w-0 flex-1 rounded-lg border-2 border-borde bg-noche px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] text-hueso uppercase outline-none focus:border-hueso/50"
        />
        <button
          type="submit"
          disabled={!listo}
          className="rounded-lg bg-bordo px-5 font-semibold text-hueso transition-colors hover:bg-bordo-2 disabled:opacity-40"
        >
          Conectar
        </button>
      </form>
    </Modal>
  );
}

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
    <Modal titulo="Ajustes del partido" onCerrar={onCerrar}>
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
    </Modal>
  );
}
