"use client";

/**
 * La carga de un partido del torneo en vivo: se toca un jugador de los que
 * están en cancha y después qué hizo.
 *
 * Después de algunas acciones la app pregunta por la otra cara de la misma
 * pelota (tras un ace, quién no pudo recibir; tras un punto de ataque, quién
 * armó y quién no pudo defender). Así se completan las estadísticas sin
 * contar el punto dos veces. Ver `preguntasDespues` en lib/torneo.ts.
 *
 * El marcador se puede mandar a la tele igual que desde el tablero: la tele
 * abre /tablero/tele y no nota la diferencia.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { duracionAnuncio, useSinApagar, type AnuncioActivo } from "./MarcadorVoley";
import { DialogoTele, Modal } from "./Tablero";
import { BOTON } from "./TorneoComun";
import { useTele } from "./useTele";
import { codigoValido } from "@/lib/enlace";
import { numeroDeSet, otro } from "@/lib/tablero";
import {
  FUNDAMENTOS,
  NOMBRE_RONDA,
  alineacionEnJuego,
  debeRotar,
  enCancha,
  fundamentosSiguientes,
  largoUltimaJugada,
  nuevoId,
  preguntasDespues,
  repasar,
  respuesta,
  rotar,
  tipoAccion,
  type Accion,
  type Equipo,
  type Fundamento,
  type Jugador,
  type Lado,
  type LugarEnJuego,
  type LugarRotacion,
  type PartidoTorneo,
  type Pregunta,
  type Torneo,
} from "@/lib/torneo";

const CLAVE_TELE = "matter:torneo:tele";

const LADO_COLOR: Record<Lado, string> = {
  local: "border-bordo-2 bg-bordo/25",
  visita: "border-marino-2 bg-marino/40",
};

function leerTele(): string | null {
  try {
    const c = localStorage.getItem(CLAVE_TELE) ?? "";
    return codigoValido(c) ? c : null;
  } catch {
    return null;
  }
}

/** Lo que falta preguntar de la pelota que se acaba de anotar. */
type Pendiente = { original: Accion; preguntas: Pregunta[]; yaSumo: boolean };

export function CargaPartido({
  torneo,
  partido,
  onCambiar,
  onVolver,
}: {
  torneo: Torneo;
  partido: PartidoTorneo;
  onCambiar: (f: (p: PartidoTorneo) => PartidoTorneo) => void;
  onVolver: () => void;
}) {
  const [elegido, setElegido] = useState<{ lado: Lado; id: string } | null>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [alineando, setAlineando] = useState<Lado | null>(null);
  const [dialogoTele, setDialogoTele] = useState(false);
  const [tele, setTele] = useState<string | null>(leerTele);
  const [anuncio, setAnuncio] = useState<AnuncioActivo | null>(null);
  const [rotacionPendiente, setRotacionPendiente] = useState<Lado | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const { marcador: m } = useMemo(() => repasar(torneo, partido), [torneo, partido]);
  const terminado = m.ganador !== null;
  // Qué fundamentos tiene sentido anotar ahora según cómo viene la pelota
  // (saque → recepción → armado → ataque → bloqueo/defensa → armado…), para
  // no mostrar los seis siempre. "Ver todos" lo saltea para una jugada rara.
  const siguiente = useMemo(() => fundamentosSiguientes(partido.acciones), [partido.acciones]);

  useSinApagar();
  const teleConectada = useTele(tele, m, anuncio);

  // Apenas un lado recupera el saque, toca rotar: el ref guarda el saque de
  // la jugada anterior para notar el cambio sin volver a avisar en cada punto
  // mientras ese mismo lado siga sacando.
  const saqueAnterior = useRef<Lado | null>(m.saque);
  useEffect(() => {
    const lado = debeRotar(saqueAnterior.current, m.saque);
    saqueAnterior.current = m.saque;
    if (lado && partido.alineacion?.[lado]) setRotacionPendiente(lado);
  }, [m.saque, partido.alineacion]);

  useEffect(() => {
    try {
      if (tele) localStorage.setItem(CLAVE_TELE, tele);
      else localStorage.removeItem(CLAVE_TELE);
    } catch {
      // Sin permiso: habrá que escribir el código otra vez.
    }
  }, [tele]);

  // Los festejos de la tele se van solos, menos el de fin de partido.
  useEffect(() => {
    if (!anuncio) return;
    const ms = duracionAnuncio(anuncio.resultado);
    if (ms === null) return;
    const t = setTimeout(() => setAnuncio(null), ms);
    return () => clearTimeout(t);
  }, [anuncio]);

  // "Ver todos" es para una jugada puntual: al elegir otro jugador se vuelve
  // a lo sugerido. Se ajusta durante el render (en vez de un efecto) porque
  // es un reseteo de estado disparado por un cambio de props/estado, no una
  // sincronización con algo externo.
  const claveElegido = elegido ? `${elegido.lado}:${elegido.id}` : null;
  const [elegidoDeVerTodos, setElegidoDeVerTodos] = useState(claveElegido);
  if (claveElegido !== elegidoDeVerTodos) {
    setElegidoDeVerTodos(claveElegido);
    setVerTodos(false);
  }

  const equipos: Record<Lado, Equipo | undefined> = {
    local: torneo.equipos.find((e) => e.id === partido.local),
    visita: torneo.equipos.find((e) => e.id === partido.visita),
  };
  const cancha: Record<Lado, Jugador[]> = {
    local: enCancha(partido, equipos.local, "local"),
    visita: enCancha(partido, equipos.visita, "visita"),
  };
  const alineacion: Record<Lado, LugarEnJuego[]> = {
    local: alineacionEnJuego(partido, equipos.local, "local"),
    visita: alineacionEnJuego(partido, equipos.visita, "visita"),
  };
  const jugadorDe = (lado: Lado, id: string | null) => equipos[lado]?.jugadores.find((j) => j.id === id);

  const aplicarRotacion = (lado: Lado) => {
    onCambiar((p) => {
      const lugares = p.alineacion?.[lado];
      if (!lugares) return p;
      return { ...p, alineacion: { ...p.alineacion, [lado]: rotar(lugares) } };
    });
    setRotacionPendiente(null);
  };

  const guardarAlineacion = (lado: Lado, lugares: LugarRotacion[]) =>
    onCambiar((p) => ({ ...p, alineacion: { ...p.alineacion, [lado]: lugares } }));

  /** Suma acciones y, si alguna hizo un punto, le avisa a la tele para el festejo. */
  const agregar = useCallback(
    (nuevas: Accion[]) => {
      const p = { ...partido, acciones: [...partido.acciones, ...nuevas] };
      onCambiar(() => p);
      const { ultimo } = repasar(torneo, p);
      if (ultimo && ultimo.indice >= partido.acciones.length) {
        // Un punto común no tiene festejo; el ace, el bloqueo y el fin de set sí.
        const r = ultimo.resultado;
        const festeja = r.jugada !== "punto" || r.tipo !== "jugada";
        setAnuncio(festeja ? { id: Date.now(), resultado: r } : null);
      }
    },
    [torneo, partido, onCambiar],
  );

  const anotarAccion = (fundamento: Fundamento, tipo: string) => {
    if (!elegido || terminado) return;
    const a: Accion = { id: nuevoId(), lado: elegido.lado, jugador: elegido.id, fundamento, tipo };
    agregar([a]);
    setElegido(null);
    const preguntas = preguntasDespues(fundamento, tipo);
    setPendiente(
      preguntas.length ? { original: a, preguntas, yaSumo: !!tipoAccion(fundamento, tipo)?.efecto } : null,
    );
  };

  /** Contesta la pregunta de turno con un jugador, o la saltea con null. */
  const contestar = (jugador: string | null) => {
    if (!pendiente) return;
    const [pregunta, ...resto] = pendiente.preguntas;
    let yaSumo = pendiente.yaSumo;
    if (jugador) {
      const r = respuesta(pendiente.original, pregunta, jugador, yaSumo);
      agregar([r]);
      if (!r.ligada && r.fundamento && tipoAccion(r.fundamento, r.tipo)?.efecto) yaSumo = true;
    }
    setPendiente(resto.length ? { ...pendiente, preguntas: resto, yaSumo } : null);
  };

  const deshacer = () => {
    onCambiar((p) => ({ ...p, acciones: p.acciones.slice(0, p.acciones.length - largoUltimaJugada(p.acciones)) }));
    setPendiente(null);
    setElegido(null);
    setAnuncio(null);
    setRotacionPendiente(null);
  };

  const puntoSinJugador = (lado: Lado) => {
    setPendiente(null);
    agregar([{ id: nuevoId(), lado, jugador: null, fundamento: null, tipo: "punto" }]);
  };

  const describir = (a: Accion) => {
    if (a.jugador === null) return `Punto ${m.nombres[a.lado]}`;
    const j = jugadorDe(a.lado, a.jugador);
    const t = tipoAccion(a.fundamento, a.tipo);
    const f = FUNDAMENTOS.find((x) => x.clave === a.fundamento)?.etiqueta;
    const quien = j ? `${j.numero ? `#${j.numero} ` : ""}${j.nombre}` : "Jugador borrado";
    return `${a.grupo ? "↳ " : ""}${quien} · ${f} ${t?.etiqueta.toLowerCase() ?? a.tipo}`;
  };

  const elegidoJugador = elegido ? jugadorDe(elegido.lado, elegido.id) : undefined;
  const pregunta = pendiente?.preguntas[0];
  const ladoPregunta = pendiente && pregunta ? (pregunta.mismoLado ? pendiente.original.lado : otro(pendiente.original.lado)) : null;

  return (
    <div className="fondo-halos flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onVolver} className={BOTON}>
          ← Volver
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold tracking-[0.2em] text-tenue uppercase">
            {terminado ? `Ganó ${m.nombres[m.ganador!]}` : `Set ${numeroDeSet(m)}`}
          </p>
          {partido.ronda && <p className="text-[0.65rem] text-tenue">{NOMBRE_RONDA[partido.ronda]}</p>}
        </div>
        <button
          type="button"
          onClick={() => setDialogoTele(true)}
          title="Mandar a la tele"
          className={`${BOTON} flex items-center gap-1.5`}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span className="sr-only">Tele</span>
          {tele && <span className={`size-2.5 rounded-full ${teleConectada ? "bg-emerald-400" : "bg-bordo-2"}`} />}
        </button>
        <button type="button" onClick={deshacer} disabled={partido.acciones.length === 0} className={BOTON}>
          ↶ Deshacer
        </button>
      </header>

      {/* Marcador */}
      <div className="grid grid-cols-2 gap-2 px-3">
        {(["local", "visita"] as const).map((lado) => (
          <div key={lado} className={`rounded-2xl border-2 p-2 text-center ${LADO_COLOR[lado]}`}>
            <p className="truncate text-sm font-bold uppercase">{m.nombres[lado]}</p>
            <p className="text-5xl font-black tabular-nums">{m.puntos[lado]}</p>
            <p className="text-xs text-tenue">
              Sets {m.sets[lado]}
              {m.saque === lado && " · saca"}
            </p>
            <button
              type="button"
              disabled={terminado}
              onClick={() => puntoSinJugador(lado)}
              className="mt-1 w-full rounded-lg border border-borde py-1 text-xs text-tenue hover:text-hueso disabled:opacity-40"
            >
              + Punto sin jugador
            </button>
          </div>
        ))}
      </div>
      {m.jugados.length > 0 && (
        <p className="mt-1 text-center text-xs text-tenue">
          Sets: {m.jugados.map((s) => `${s.local}-${s.visita}`).join(" · ")}
        </p>
      )}

      {/* Jugadores en cancha, enfrentados como en la cancha real: el local
          arriba con lo de adelante pegado a la red imaginaria del medio, la
          visita abajo en espejo (también con lo de adelante junto a la red). */}
      <div className="mt-3 space-y-1.5 px-3">
        <EquipoEnCancha
          lado="local"
          nombre={m.nombres.local}
          tieneAlineacion={!!partido.alineacion?.local}
          lugares={alineacion.local}
          elegido={elegido?.lado === "local" ? elegido.id : null}
          bloqueado={terminado || !!pendiente}
          onElegir={(id) =>
            setElegido((e) => (e?.lado === "local" && e.id === id ? null : { lado: "local", id }))
          }
          onAlinear={() => setAlineando("local")}
          primeraFila="atras"
        />
        <div className="flex items-center gap-2 py-0.5 text-[0.6rem] tracking-[0.3em] text-tenue uppercase">
          <span className="h-px flex-1 bg-borde" />
          Red
          <span className="h-px flex-1 bg-borde" />
        </div>
        <EquipoEnCancha
          lado="visita"
          nombre={m.nombres.visita}
          tieneAlineacion={!!partido.alineacion?.visita}
          lugares={alineacion.visita}
          elegido={elegido?.lado === "visita" ? elegido.id : null}
          bloqueado={terminado || !!pendiente}
          onElegir={(id) =>
            setElegido((e) => (e?.lado === "visita" && e.id === id ? null : { lado: "visita", id }))
          }
          onAlinear={() => setAlineando("visita")}
          primeraFila="adelante"
        />
      </div>

      {rotacionPendiente && (
        <div className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm font-semibold">{m.nombres[rotacionPendiente]} recuperó el saque: toca rotar.</p>
          <button
            type="button"
            onClick={() => aplicarRotacion(rotacionPendiente)}
            className={`${BOTON} shrink-0 border-emerald-500/60`}
          >
            ↻ Rotar
          </button>
        </div>
      )}

      {/* Pregunta por la otra cara de la pelota */}
      {pendiente && pregunta && ladoPregunta && (
        <div className="sticky bottom-0 mt-3 border-t border-borde bg-carbon/95 px-3 pt-2 pb-4 backdrop-blur">
          <p className="text-xs text-tenue">{describir(pendiente.original)}</p>
          <p className="mb-2 font-bold">
            {pregunta.texto} <span className="font-normal text-tenue">· {m.nombres[ladoPregunta]}</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {cancha[ladoPregunta]
              .filter((j) => !(pregunta.mismoLado && j.id === pendiente.original.jugador))
              .map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => contestar(j.id)}
                  className={`truncate rounded-lg border-2 px-2 py-2 text-sm font-semibold ${LADO_COLOR[ladoPregunta]}`}
                >
                  {j.numero && `${j.numero} `}
                  {j.nombre}
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => contestar(null)} className={`${BOTON} flex-1`}>
              {pregunta.fundamento === "bloqueo" ? "Nadie" : "No sé / saltear"}
            </button>
            <button type="button" onClick={() => setPendiente(null)} className={`${BOTON} text-tenue`}>
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Acciones del jugador elegido */}
      {elegidoJugador && elegido && !pendiente && (
        <div className="sticky bottom-0 mt-3 border-t border-borde bg-carbon/95 px-3 pt-2 pb-4 backdrop-blur">
          <p className="mb-2 text-sm">
            <span className="font-bold">
              {elegidoJugador.numero && `#${elegidoJugador.numero} `}
              {elegidoJugador.nombre}
            </span>{" "}
            <span className="text-tenue">· {m.nombres[elegido.lado]}</span>
          </p>
          <div className="space-y-2">
            {FUNDAMENTOS.filter((f) => verTodos || siguiente.includes(f.clave)).map((f) => (
              <div key={f.clave} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-semibold tracking-wide text-tenue uppercase">
                  {f.etiqueta}
                </span>
                <div className="grid flex-1 auto-cols-fr grid-flow-col gap-1.5">
                  {f.tipos.map((t) => (
                    <button
                      key={t.clave}
                      type="button"
                      onClick={() => anotarAccion(f.clave, t.clave)}
                      className={`rounded-lg border py-2 text-xs font-bold transition active:scale-95 ${
                        t.efecto === "punto"
                          ? "border-emerald-500/60 bg-emerald-500/15"
                          : t.efecto === "error"
                            ? "border-bordo-2/70 bg-bordo/20"
                            : "border-borde bg-carbon-2"
                      }`}
                    >
                      {t.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className="mt-2 text-xs text-tenue underline hover:text-hueso"
          >
            {verTodos ? "Volver a lo sugerido" : "Ver todos los fundamentos"}
          </button>
        </div>
      )}

      {/* Últimas jugadas */}
      {!elegidoJugador && !pendiente && (
        <div className="mt-4 px-3 pb-6">
          <p className="text-xs font-semibold tracking-wide text-tenue uppercase">Últimas jugadas</p>
          {partido.acciones.length === 0 ? (
            <p className="mt-1 text-sm text-tenue">Tocá un jugador y elegí qué hizo.</p>
          ) : (
            <ol className="mt-1 space-y-0.5 text-sm">
              {partido.acciones
                .slice(-10)
                .reverse()
                .map((a) => (
                  <li key={a.id} className={`truncate ${a.grupo ? "pl-3 text-tenue" : ""}`}>
                    {describir(a)}
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}

      {alineando && equipos[alineando] && (
        <DialogoAlineacion
          equipo={equipos[alineando]!}
          actual={partido.alineacion?.[alineando]}
          onGuardar={(lugares) => guardarAlineacion(alineando, lugares)}
          onCerrar={() => setAlineando(null)}
        />
      )}

      {dialogoTele && (
        <DialogoTele tele={tele} conectada={teleConectada} onEnlazar={setTele} onCerrar={() => setDialogoTele(false)} />
      )}
    </div>
  );
}

/** Adelante, de izquierda a derecha: lugares 4, 3 y 2. Atrás: 5, 6 y 1 (el que saca). */
const FILA_ADELANTE = [3, 2, 1];
const FILA_ATRAS = [4, 5, 0];

/**
 * La cancha en 2 filas de 3. `primeraFila` elige cuál va arriba: los dos
 * equipos se dibujan enfrentados, con lo de adelante de cada uno pegado a la
 * red imaginaria que queda en el medio (ver `EquipoEnCancha`).
 */
function GrillaCancha({
  lado,
  lugares,
  elegido,
  bloqueado,
  onElegir,
  primeraFila,
}: {
  lado: Lado;
  lugares: LugarEnJuego[];
  elegido: string | null;
  bloqueado: boolean;
  onElegir: (id: string) => void;
  primeraFila: "adelante" | "atras";
}) {
  const celda = (indice: number) => {
    const l = lugares[indice];
    if (!l?.jugador) {
      return <div key={indice} className="rounded-lg border border-dashed border-borde/60" />;
    }
    const activo = elegido === l.jugador.id;
    return (
      <button
        key={indice}
        type="button"
        disabled={bloqueado}
        onClick={() => onElegir(l.jugador!.id)}
        className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-0.5 py-1 text-center leading-tight transition disabled:opacity-40 ${
          activo ? LADO_COLOR[lado] : "border-borde bg-carbon"
        }`}
      >
        <span className="font-black tabular-nums">{l.jugador.numero || "–"}</span>
        <span className="w-full truncate text-[0.65rem]">{l.jugador.nombre}</span>
        {/* Reglas FIVB desde 2021: el líbero puede sacar en el único lugar en el
            que juega, así que "L" y "saca" pueden darse juntos acá. */}
        <span className="text-[0.6rem] font-bold text-emerald-400">
          {[l.esLibero && "L", l.indice === 0 && "saca"].filter(Boolean).join(" · ") || " "}
        </span>
      </button>
    );
  };

  const filas =
    primeraFila === "adelante"
      ? [FILA_ADELANTE, FILA_ATRAS]
      : [FILA_ATRAS, FILA_ADELANTE];

  return (
    <div className="space-y-1">
      {filas.map((fila, i) => (
        <div key={i} className="grid grid-cols-3 gap-1">
          {fila.map(celda)}
        </div>
      ))}
    </div>
  );
}

/** El nombre, el link a la alineación y la cancha (o el aviso de armarla) de un lado. */
function EquipoEnCancha({
  lado,
  nombre,
  tieneAlineacion,
  lugares,
  elegido,
  bloqueado,
  onElegir,
  onAlinear,
  primeraFila,
}: {
  lado: Lado;
  nombre: string;
  tieneAlineacion: boolean;
  lugares: LugarEnJuego[];
  elegido: string | null;
  bloqueado: boolean;
  onElegir: (id: string) => void;
  onAlinear: () => void;
  primeraFila: "adelante" | "atras";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-tenue">
        <span className="font-semibold text-hueso">{nombre}</span>
        <button type="button" onClick={onAlinear} className="underline hover:text-hueso">
          Alineación
        </button>
      </div>
      {tieneAlineacion ? (
        <GrillaCancha
          lado={lado}
          lugares={lugares}
          elegido={elegido}
          bloqueado={bloqueado}
          onElegir={onElegir}
          primeraFila={primeraFila}
        />
      ) : (
        <p className="text-xs text-tenue">
          Todavía no armaste la alineación. Tocá <strong>Alineación</strong> para elegir a los 6 titulares.
        </p>
      )}
    </div>
  );
}

/**
 * La alineación inicial: se tocan los 6 titulares en el orden en que sacan
 * (el primero toca es el que saca primero), y si el equipo tiene líbero
 * cargado se elige en qué lugar entra cuando le toca atrás. Sirve también
 * para corregirla después: se reabre con lo que ya había elegido.
 */
function DialogoAlineacion({
  equipo,
  actual,
  onGuardar,
  onCerrar,
}: {
  equipo: Equipo;
  actual?: LugarRotacion[];
  onGuardar: (lugares: LugarRotacion[]) => void;
  onCerrar: () => void;
}) {
  const [orden, setOrden] = useState<string[]>(() => actual?.map((l) => l.titular) ?? []);
  const [libero, setLibero] = useState<number | null>(() => {
    const i = actual?.findIndex((l) => l.libero) ?? -1;
    return i >= 0 ? i : null;
  });

  if (equipo.jugadores.length < 6) {
    return (
      <Modal titulo={`Alineación · ${equipo.nombre}`} onCerrar={onCerrar}>
        <p className="text-sm text-tenue">
          Hacen falta 6 jugadores cargados en el plantel para armar la alineación (hoy tiene{" "}
          {equipo.jugadores.length}).
        </p>
      </Modal>
    );
  }

  const alternar = (id: string) =>
    setOrden((o) => {
      const i = o.indexOf(id);
      if (i >= 0) {
        setLibero((l) => (l === null ? l : l === i ? null : l > i ? l - 1 : l));
        return o.filter((x) => x !== id);
      }
      return o.length >= 6 ? o : [...o, id];
    });

  const completo = orden.length === 6;
  const libre = equipo.liberoId;
  const liberoSuelto = !!libre && !orden.includes(libre);

  const guardar = () => {
    const lugares: LugarRotacion[] = orden.map((id, i) => ({
      titular: id,
      ...(i === libero && libre ? { libero: libre } : {}),
    }));
    onGuardar(lugares);
    onCerrar();
  };

  return (
    <Modal titulo={`Alineación · ${equipo.nombre}`} onCerrar={onCerrar}>
      <p className="mb-3 text-sm text-tenue">
        Tocá a los 6 titulares en el orden en que van a sacar, empezando por quien saca primero.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {equipo.jugadores.map((j) => {
          const i = orden.indexOf(j.id);
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => alternar(j.id)}
              disabled={i === -1 && completo}
              className={`flex items-center gap-2 rounded-xl border-2 px-2 py-2 text-left text-sm disabled:opacity-30 ${
                i >= 0 ? "border-emerald-500/70 bg-emerald-500/15" : "border-borde bg-noche text-tenue"
              }`}
            >
              {i >= 0 && <span className="w-4 text-center font-black text-emerald-400">{i + 1}</span>}
              <span className="w-7 text-right font-black tabular-nums">{j.numero || "–"}</span>
              <span className="truncate">{j.nombre}</span>
            </button>
          );
        })}
      </div>

      {completo && liberoSuelto && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-tenue">
            ¿En qué lugar entra {equipo.jugadores.find((j) => j.id === libre)?.nombre} (líbero) cuando le toca
            atrás?
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {orden.map((id, i) => {
              const j = equipo.jugadores.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLibero((l) => (l === i ? null : i))}
                  className={`truncate rounded-lg border-2 px-2 py-2 text-xs font-semibold ${
                    libero === i ? "border-emerald-500/70 bg-emerald-500/15" : "border-borde text-tenue"
                  }`}
                >
                  {i + 1}. {j?.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button type="button" onClick={guardar} disabled={!completo} className={`${BOTON} mt-4 w-full`}>
        Guardar
      </button>
    </Modal>
  );
}
