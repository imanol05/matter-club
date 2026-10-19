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

import { useCallback, useEffect, useMemo, useState } from "react";

import { duracionAnuncio, useSinApagar, type AnuncioActivo } from "./MarcadorVoley";
import { DialogoTele, Modal } from "./Tablero";
import { BOTON } from "./TorneoComun";
import { useTele } from "./useTele";
import { codigoValido } from "@/lib/enlace";
import { numeroDeSet, otro } from "@/lib/tablero";
import {
  FUNDAMENTOS,
  NOMBRE_RONDA,
  enCancha,
  largoUltimaJugada,
  nuevoId,
  preguntasDespues,
  repasar,
  respuesta,
  tipoAccion,
  type Accion,
  type Equipo,
  type Fundamento,
  type Jugador,
  type Lado,
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
  const [cambios, setCambios] = useState<Lado | null>(null);
  const [dialogoTele, setDialogoTele] = useState(false);
  const [tele, setTele] = useState<string | null>(leerTele);
  const [anuncio, setAnuncio] = useState<AnuncioActivo | null>(null);

  const { marcador: m } = useMemo(() => repasar(torneo, partido), [torneo, partido]);
  const terminado = m.ganador !== null;

  useSinApagar();
  const teleConectada = useTele(tele, m, anuncio);

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

  const equipos: Record<Lado, Equipo | undefined> = {
    local: torneo.equipos.find((e) => e.id === partido.local),
    visita: torneo.equipos.find((e) => e.id === partido.visita),
  };
  const cancha: Record<Lado, Jugador[]> = {
    local: enCancha(partido, equipos.local, "local"),
    visita: enCancha(partido, equipos.visita, "visita"),
  };
  const jugadorDe = (lado: Lado, id: string | null) => equipos[lado]?.jugadores.find((j) => j.id === id);

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

      {/* Jugadores en cancha */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-3">
        {(["local", "visita"] as const).map((lado) => (
          <div key={lado} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-tenue">
              <span>En cancha ({cancha[lado].length})</span>
              <button type="button" onClick={() => setCambios(lado)} className="underline hover:text-hueso">
                Cambios
              </button>
            </div>
            {cancha[lado].map((j) => {
              const activo = elegido?.lado === lado && elegido.id === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  disabled={terminado || !!pendiente}
                  onClick={() => setElegido(activo ? null : { lado, id: j.id })}
                  className={`flex w-full items-center gap-2 rounded-xl border-2 px-2 py-2 text-left text-sm transition disabled:opacity-40 ${
                    activo ? LADO_COLOR[lado] : "border-borde bg-carbon"
                  }`}
                >
                  <span className="w-7 text-right font-black tabular-nums">{j.numero || "–"}</span>
                  <span className="truncate">{j.nombre}</span>
                </button>
              );
            })}
            {cancha[lado].length === 0 && (
              <p className="text-xs text-tenue">Nadie en cancha. Tocá Cambios para elegir quiénes juegan.</p>
            )}
          </div>
        ))}
      </div>

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
            {FUNDAMENTOS.map((f) => (
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

      {cambios && equipos[cambios] && (
        <DialogoCambios
          equipo={equipos[cambios]!}
          enCancha={cancha[cambios].map((j) => j.id)}
          onCambiar={(ids) =>
            onCambiar((p) => ({
              ...p,
              enCancha: {
                local: cancha.local.map((j) => j.id),
                visita: cancha.visita.map((j) => j.id),
                ...p.enCancha,
                [cambios]: ids,
              },
            }))
          }
          onCerrar={() => setCambios(null)}
        />
      )}

      {dialogoTele && (
        <DialogoTele tele={tele} conectada={teleConectada} onEnlazar={setTele} onCerrar={() => setDialogoTele(false)} />
      )}
    </div>
  );
}

/** Quiénes están en cancha. Se tocan para entrar o salir; vale desde la próxima jugada. */
function DialogoCambios({
  equipo,
  enCancha,
  onCambiar,
  onCerrar,
}: {
  equipo: Equipo;
  enCancha: string[];
  onCambiar: (ids: string[]) => void;
  onCerrar: () => void;
}) {
  const alternar = (id: string) =>
    onCambiar(
      equipo.jugadores
        .map((j) => j.id)
        .filter((x) => (x === id ? !enCancha.includes(x) : enCancha.includes(x))),
    );

  return (
    <Modal titulo={`En cancha · ${equipo.nombre}`} onCerrar={onCerrar}>
      <p className="mb-3 text-sm text-tenue">
        Tocá para que entre o salga. Hay {enCancha.length} en cancha
        {enCancha.length > 7 && " (más de 6 y el líbero: fijate si sobra alguno)"}.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {equipo.jugadores.map((j) => {
          const esta = enCancha.includes(j.id);
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => alternar(j.id)}
              aria-pressed={esta}
              className={`flex items-center gap-2 rounded-xl border-2 px-2 py-2 text-left text-sm ${
                esta ? "border-emerald-500/70 bg-emerald-500/15" : "border-borde bg-noche text-tenue"
              }`}
            >
              <span className="w-7 text-right font-black tabular-nums">{j.numero || "–"}</span>
              <span className="truncate">{j.nombre}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onCerrar} className={`${BOTON} mt-4 w-full`}>
        Listo
      </button>
    </Modal>
  );
}
