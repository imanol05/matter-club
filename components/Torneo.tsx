"use client";

/**
 * Estadísticas del torneo: se cargan los equipos con sus jugadores, se anota
 * cada partido jugada por jugada (saque, recepción, ataque, bloqueo) y al final
 * salen los premios.
 *
 * Todo vive en el navegador (`localStorage`), igual que el tablero: no hace
 * falta internet en la cancha. Para no depender de un solo celu se puede
 * exportar el torneo a un archivo y abrirlo en otro.
 */

import { useEffect, useMemo, useState } from "react";

import { Anillo } from "./Marca";
import { useEnNavegador, useSinApagar } from "./MarcadorVoley";
import { numeroDeSet } from "@/lib/tablero";
import {
  FUNDAMENTOS,
  MIN_RECEPCIONES,
  esTorneo,
  estadisticas,
  marcador,
  nombreEquipo,
  nuevoId,
  premios,
  tipoAccion,
  torneoNuevo,
  type Accion,
  type Equipo,
  type Estadistica,
  type Fundamento,
  type Lado,
  type PartidoTorneo,
  type Torneo as DatosTorneo,
} from "@/lib/torneo";

const CLAVE = "matter:torneo";

type Vista = "equipos" | "partidos" | "premios";

function leerGuardado(): DatosTorneo {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const t = JSON.parse(crudo);
      if (esTorneo(t)) return t;
    }
  } catch {
    // Navegación privada o dato roto: arrancamos de cero.
  }
  return torneoNuevo();
}

const BOTON =
  "rounded-xl border border-borde bg-carbon-2 px-3 py-2 text-sm font-semibold text-hueso transition hover:border-hueso/40 active:scale-95 disabled:opacity-40";
const CAMPO =
  "min-w-0 rounded-xl border border-borde bg-noche px-3 py-2 text-sm text-hueso placeholder:text-tenue focus:border-marino-2 focus:outline-none";

export function Torneo() {
  if (!useEnNavegador()) return <div className="min-h-dvh bg-noche" />;
  return <TorneoVivo />;
}

function TorneoVivo() {
  const [torneo, setTorneo] = useState<DatosTorneo>(leerGuardado);
  const [vista, setVista] = useState<Vista>("equipos");
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(torneo));
    } catch {
      // Sin espacio o sin permiso: se sigue usando, pero conviene exportar.
    }
  }, [torneo]);

  const partido = torneo.partidos.find((p) => p.id === abierto);
  if (partido) {
    return (
      <CargaPartido
        torneo={torneo}
        partido={partido}
        onCambiar={(acciones) =>
          setTorneo((t) => ({
            ...t,
            partidos: t.partidos.map((p) => (p.id === partido.id ? { ...p, acciones } : p)),
          }))
        }
        onVolver={() => setAbierto(null)}
      />
    );
  }

  return (
    <div className="fondo-halos min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center gap-3 px-4 pt-4">
        <Anillo className="size-10" />
        <input
          value={torneo.nombre}
          onChange={(e) => setTorneo((t) => ({ ...t, nombre: e.target.value }))}
          aria-label="Nombre del torneo"
          className="min-w-0 flex-1 bg-transparent text-xl font-bold text-hueso focus:outline-none sm:text-2xl"
        />
      </header>

      <nav className="mx-auto mt-4 flex max-w-4xl gap-1 px-4">
        {(
          [
            ["equipos", "Equipos"],
            ["partidos", "Partidos"],
            ["premios", "Estadísticas y premios"],
          ] as const
        ).map(([v, etiqueta]) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`rounded-t-xl px-3 py-2 text-sm font-semibold transition-colors ${
              vista === v ? "bg-carbon text-hueso" : "text-tenue hover:text-hueso"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl px-4 pb-10">
        <div className="rounded-b-2xl rounded-tr-2xl bg-carbon p-4">
          {vista === "equipos" && <VistaEquipos torneo={torneo} setTorneo={setTorneo} />}
          {vista === "partidos" && (
            <VistaPartidos torneo={torneo} setTorneo={setTorneo} onAbrir={setAbierto} />
          )}
          {vista === "premios" && <VistaPremios torneo={torneo} />}
        </div>
        <Archivo torneo={torneo} setTorneo={setTorneo} />
      </main>
    </div>
  );
}

type Props = {
  torneo: DatosTorneo;
  setTorneo: React.Dispatch<React.SetStateAction<DatosTorneo>>;
};

/* ───────────────────────────── Equipos ───────────────────────────── */

function VistaEquipos({ torneo, setTorneo }: Props) {
  const [nombre, setNombre] = useState("");

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    setTorneo((t) => ({ ...t, equipos: [...t.equipos, { id: nuevoId(), nombre: n, jugadores: [] }] }));
    setNombre("");
  };

  const cambiar = (id: string, f: (e: Equipo) => Equipo) =>
    setTorneo((t) => ({ ...t, equipos: t.equipos.map((e) => (e.id === id ? f(e) : e)) }));

  const borrar = (eq: Equipo) => {
    if (torneo.partidos.some((p) => p.local === eq.id || p.visita === eq.id)) {
      alert("Este equipo tiene partidos cargados. Borrá primero esos partidos.");
      return;
    }
    if (!confirm(`¿Borrar ${eq.nombre} y sus jugadores?`)) return;
    setTorneo((t) => ({ ...t, equipos: t.equipos.filter((e) => e.id !== eq.id) }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del equipo"
          className={`${CAMPO} flex-1`}
        />
        <button type="submit" className={BOTON}>
          Agregar equipo
        </button>
      </form>

      {torneo.equipos.length === 0 && (
        <p className="text-sm text-tenue">Todavía no hay equipos. Empezá agregando uno.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {torneo.equipos.map((eq) => (
          <TarjetaEquipo
            key={eq.id}
            equipo={eq}
            onCambiar={(f) => cambiar(eq.id, f)}
            onBorrar={() => borrar(eq)}
            jugadorConAcciones={(id) =>
              torneo.partidos.some((p) => p.acciones.some((a) => a.jugador === id))
            }
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaEquipo({
  equipo,
  onCambiar,
  onBorrar,
  jugadorConAcciones,
}: {
  equipo: Equipo;
  onCambiar: (f: (e: Equipo) => Equipo) => void;
  onBorrar: () => void;
  jugadorConAcciones: (id: string) => boolean;
}) {
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    onCambiar((eq) => ({
      ...eq,
      jugadores: [...eq.jugadores, { id: nuevoId(), nombre: n, numero: numero.trim() }],
    }));
    setNombre("");
    setNumero("");
  };

  const quitar = (id: string, n: string) => {
    const aviso = jugadorConAcciones(id)
      ? `${n} tiene jugadas cargadas: si lo sacás, se pierden sus estadísticas (el marcador no cambia). ¿Sacarlo igual?`
      : `¿Sacar a ${n}?`;
    if (!confirm(aviso)) return;
    onCambiar((eq) => ({ ...eq, jugadores: eq.jugadores.filter((j) => j.id !== id) }));
  };

  return (
    <section className="rounded-2xl border border-borde bg-noche/60 p-3">
      <div className="flex items-center gap-2">
        <input
          value={equipo.nombre}
          onChange={(e) => onCambiar((eq) => ({ ...eq, nombre: e.target.value }))}
          aria-label="Nombre del equipo"
          className="min-w-0 flex-1 bg-transparent font-bold text-hueso focus:outline-none"
        />
        <button type="button" onClick={onBorrar} className="text-xs text-tenue hover:text-bordo-2">
          Borrar
        </button>
      </div>

      <ul className="mt-2 space-y-1">
        {equipo.jugadores.map((j) => (
          <li key={j.id} className="flex items-center gap-2 text-sm">
            <span className="w-8 text-right font-bold text-tenue tabular-nums">{j.numero || "–"}</span>
            <span className="flex-1 truncate">{j.nombre}</span>
            <button
              type="button"
              onClick={() => quitar(j.id, j.nombre)}
              aria-label={`Sacar a ${j.nombre}`}
              className="px-1 text-tenue hover:text-bordo-2"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={agregar} className="mt-3 flex gap-2">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="N°"
          inputMode="numeric"
          className={`${CAMPO} w-14`}
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del jugador"
          className={`${CAMPO} flex-1`}
        />
        <button type="submit" className={BOTON}>
          +
        </button>
      </form>
    </section>
  );
}

/* ───────────────────────────── Partidos ───────────────────────────── */

function VistaPartidos({ torneo, setTorneo, onAbrir }: Props & { onAbrir: (id: string) => void }) {
  const [local, setLocal] = useState("");
  const [visita, setVisita] = useState("");
  const [setsParaGanar, setSets] = useState<2 | 3>(2);

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!local || !visita || local === visita) return;
    const p: PartidoTorneo = { id: nuevoId(), local, visita, setsParaGanar, creado: Date.now(), acciones: [] };
    setTorneo((t) => ({ ...t, partidos: [...t.partidos, p] }));
    onAbrir(p.id);
  };

  const borrar = (p: PartidoTorneo) => {
    const n = `${nombreEquipo(torneo, p.local)} vs ${nombreEquipo(torneo, p.visita)}`;
    if (!confirm(`¿Borrar el partido ${n}? Se pierden sus ${p.acciones.length} jugadas.`)) return;
    setTorneo((t) => ({ ...t, partidos: t.partidos.filter((x) => x.id !== p.id) }));
  };

  if (torneo.equipos.length < 2) {
    return <p className="text-sm text-tenue">Cargá al menos dos equipos para armar un partido.</p>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="flex flex-wrap items-center gap-2">
        <select value={local} onChange={(e) => setLocal(e.target.value)} className={CAMPO}>
          <option value="">Local…</option>
          {torneo.equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <span className="text-tenue">vs</span>
        <select value={visita} onChange={(e) => setVisita(e.target.value)} className={CAMPO}>
          <option value="">Visita…</option>
          {torneo.equipos
            .filter((e) => e.id !== local)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
        </select>
        <select
          value={setsParaGanar}
          onChange={(e) => setSets(Number(e.target.value) as 2 | 3)}
          className={CAMPO}
        >
          <option value={2}>Al mejor de 3</option>
          <option value={3}>Al mejor de 5</option>
        </select>
        <button type="submit" disabled={!local || !visita || local === visita} className={BOTON}>
          Empezar partido
        </button>
      </form>

      {torneo.partidos.length === 0 && <p className="text-sm text-tenue">Todavía no hay partidos.</p>}

      <ul className="space-y-2">
        {[...torneo.partidos].reverse().map((p) => {
          const m = marcador(torneo, p);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-borde bg-noche/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.nombres.local} <span className="text-tenue">vs</span> {m.nombres.visita}
                </p>
                <p className="text-xs text-tenue">
                  Sets {m.sets.local}–{m.sets.visita}
                  {m.jugados.length > 0 && ` (${m.jugados.map((s) => `${s.local}-${s.visita}`).join(", ")})`}
                  {" · "}
                  {m.ganador ? `Ganó ${m.nombres[m.ganador]}` : "En juego"}
                </p>
              </div>
              <button type="button" onClick={() => onAbrir(p.id)} className={BOTON}>
                {m.ganador ? "Ver" : "Seguir"}
              </button>
              <button type="button" onClick={() => borrar(p)} className="text-xs text-tenue hover:text-bordo-2">
                Borrar
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────────── Carga en vivo ───────────────────────────── */

const LADO_COLOR: Record<Lado, string> = {
  local: "border-bordo-2 bg-bordo/25",
  visita: "border-marino-2 bg-marino/40",
};

function CargaPartido({
  torneo,
  partido,
  onCambiar,
  onVolver,
}: {
  torneo: DatosTorneo;
  partido: PartidoTorneo;
  onCambiar: (acciones: Accion[]) => void;
  onVolver: () => void;
}) {
  const [elegido, setElegido] = useState<{ lado: Lado; id: string } | null>(null);
  const m = useMemo(() => marcador(torneo, partido), [torneo, partido]);
  const terminado = m.ganador !== null;

  useSinApagar();

  const equipos: Record<Lado, Equipo | undefined> = {
    local: torneo.equipos.find((e) => e.id === partido.local),
    visita: torneo.equipos.find((e) => e.id === partido.visita),
  };
  const jugador = elegido ? equipos[elegido.lado]?.jugadores.find((j) => j.id === elegido.id) : undefined;

  const sumar = (a: Accion) => {
    if (terminado) return;
    onCambiar([...partido.acciones, a]);
  };

  const anotarAccion = (fundamento: Fundamento, tipo: string) => {
    if (!elegido) return;
    sumar({ id: nuevoId(), lado: elegido.lado, jugador: elegido.id, fundamento, tipo });
    setElegido(null);
  };

  const nombreDe = (a: Accion) => {
    if (a.jugador === null) return `Punto ${m.nombres[a.lado]}`;
    const j = equipos[a.lado]?.jugadores.find((x) => x.id === a.jugador);
    const t = tipoAccion(a.fundamento, a.tipo);
    const f = FUNDAMENTOS.find((x) => x.clave === a.fundamento)?.etiqueta;
    return `${j ? `${j.numero ? `#${j.numero} ` : ""}${j.nombre}` : "Jugador borrado"} · ${f} ${t?.etiqueta.toLowerCase() ?? a.tipo}`;
  };

  return (
    <div className="fondo-halos flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onVolver} className={BOTON}>
          ← Volver
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[0.2em] text-tenue uppercase">
          {terminado ? `Ganó ${m.nombres[m.ganador!]}` : `Set ${numeroDeSet(m)}`}
        </p>
        <button
          type="button"
          onClick={() => onCambiar(partido.acciones.slice(0, -1))}
          disabled={partido.acciones.length === 0}
          className={BOTON}
        >
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
              onClick={() => sumar({ id: nuevoId(), lado, jugador: null, fundamento: null, tipo: "punto" })}
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

      {/* Jugadores */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-3">
        {(["local", "visita"] as const).map((lado) => (
          <div key={lado} className="space-y-1.5">
            {(equipos[lado]?.jugadores ?? []).map((j) => {
              const activo = elegido?.lado === lado && elegido.id === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  disabled={terminado}
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
            {(equipos[lado]?.jugadores.length ?? 0) === 0 && (
              <p className="text-xs text-tenue">Este equipo no tiene jugadores cargados.</p>
            )}
          </div>
        ))}
      </div>

      {/* Acciones del jugador elegido */}
      {jugador && elegido && (
        <div className="sticky bottom-0 mt-3 border-t border-borde bg-carbon/95 px-3 pt-2 pb-4 backdrop-blur">
          <p className="mb-2 text-sm">
            <span className="font-bold">
              {jugador.numero && `#${jugador.numero} `}
              {jugador.nombre}
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
      {!jugador && (
        <div className="mt-4 px-3 pb-6">
          <p className="text-xs font-semibold tracking-wide text-tenue uppercase">Últimas jugadas</p>
          {partido.acciones.length === 0 ? (
            <p className="mt-1 text-sm text-tenue">Tocá un jugador y elegí qué hizo.</p>
          ) : (
            <ol className="mt-1 space-y-0.5 text-sm">
              {partido.acciones
                .slice(-8)
                .reverse()
                .map((a) => (
                  <li key={a.id} className="truncate">
                    {nombreDe(a)}
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Estadísticas y premios ───────────────────────────── */

const MEDALLA = ["🥇", "🥈", "🥉"];

function VistaPremios({ torneo }: { torneo: DatosTorneo }) {
  const [filtro, setFiltro] = useState<string>("todo");

  const partidos = useMemo(
    () => (filtro === "todo" ? torneo.partidos : torneo.partidos.filter((p) => p.id === filtro)),
    [torneo, filtro],
  );
  const stats = useMemo(() => estadisticas(torneo, partidos), [torneo, partidos]);
  const lista = useMemo(() => premios(stats), [stats]);

  if (torneo.partidos.length === 0) {
    return <p className="text-sm text-tenue">Cuando cargues partidos, acá aparecen las estadísticas.</p>;
  }

  return (
    <div className="space-y-6">
      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={CAMPO}>
        <option value="todo">Todo el torneo</option>
        {torneo.partidos.map((p) => (
          <option key={p.id} value={p.id}>
            {nombreEquipo(torneo, p.local)} vs {nombreEquipo(torneo, p.visita)}
          </option>
        ))}
      </select>

      <section className="grid gap-3 sm:grid-cols-2">
        {lista.map((pr) => (
          <article key={pr.titulo} className="rounded-2xl border border-borde bg-noche/60 p-3">
            <h3 className="font-bold">{pr.titulo}</h3>
            <p className="text-xs text-tenue">{pr.criterio}</p>
            {pr.podio.length === 0 ? (
              <p className="mt-2 text-sm text-tenue">Sin datos suficientes todavía.</p>
            ) : (
              <ol className="mt-2 space-y-1">
                {pr.podio.map(({ e, valor }, i) => (
                  <li key={e.jugador.id} className="flex items-center gap-2 text-sm">
                    <span>{MEDALLA[i]}</span>
                    <span className="flex-1 truncate">
                      <span className="font-semibold">{e.jugador.nombre}</span>{" "}
                      <span className="text-tenue">· {e.equipo.nombre}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{valor}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </section>

      <TablaEstadisticas stats={stats} />
      <p className="text-xs text-tenue">
        Los premios son una sugerencia a partir de lo que se cargó: si un jugador se perdió partidos o
        no se anotaron todas sus jugadas, conviene mirar la tabla antes de entregar. La recepción pide
        al menos {MIN_RECEPCIONES} recepciones para competir.
      </p>
    </div>
  );
}

function TablaEstadisticas({ stats }: { stats: Estadistica[] }) {
  const ordenadas = [...stats].sort((a, b) => b.puntos - a.puntos);
  const celda = "px-2 py-1 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-2xl border border-borde">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-carbon-2 text-xs text-tenue">
          <tr>
            <th className="px-2 py-1 text-left" rowSpan={2}>
              Jugador
            </th>
            <th className={celda} rowSpan={2}>
              Pts
            </th>
            <th className={celda} rowSpan={2}>
              Err
            </th>
            <th className="px-2 pt-1 text-center" colSpan={3}>
              Saque
            </th>
            <th className="px-2 pt-1 text-center" colSpan={2}>
              Recepción
            </th>
            <th className="px-2 pt-1 text-center" colSpan={3}>
              Ataque
            </th>
            <th className="px-2 pt-1 text-center" colSpan={3}>
              Bloqueo
            </th>
          </tr>
          <tr>
            {["Ace", "OK", "Err", "Prom", "Tot", "Pto", "OK", "Err", "Pto", "Toq", "Err"].map((h, i) => (
              <th key={i} className={celda}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((e) => {
            const c = e.conteo;
            return (
              <tr key={e.jugador.id} className="border-t border-borde">
                <td className="px-2 py-1">
                  <span className="font-semibold">{e.jugador.nombre}</span>{" "}
                  <span className="text-xs text-tenue">{e.equipo.nombre}</span>
                </td>
                <td className={`${celda} font-bold`}>{e.puntos}</td>
                <td className={celda}>{e.errores}</td>
                <td className={celda}>{c.saque.ace}</td>
                <td className={celda}>{c.saque.enjuego}</td>
                <td className={celda}>{c.saque.error}</td>
                <td className={celda}>{e.promedioRecepcion?.toFixed(2) ?? "–"}</td>
                <td className={celda}>{e.recepciones}</td>
                <td className={celda}>{c.ataque.punto}</td>
                <td className={celda}>{c.ataque.enjuego}</td>
                <td className={celda}>{c.ataque.error}</td>
                <td className={celda}>{c.bloqueo.punto}</td>
                <td className={celda}>{c.bloqueo.toque}</td>
                <td className={celda}>{c.bloqueo.error}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────────── Exportar / importar ───────────────────────────── */

function Archivo({ torneo, setTorneo }: Props) {
  const exportar = () => {
    const blob = new Blob([JSON.stringify(torneo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${torneo.nombre.trim() || "torneo"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const t = JSON.parse(await archivo.text());
      if (!esTorneo(t)) throw new Error();
      if (confirm(`¿Reemplazar el torneo actual por "${t.nombre}"?`)) setTorneo(t);
    } catch {
      alert("Ese archivo no es un torneo exportado desde acá.");
    }
  };

  const nuevo = () => {
    if (!confirm("¿Empezar un torneo nuevo? Se borra el actual de este celu (exportalo antes si lo querés guardar).")) return;
    setTorneo(torneoNuevo());
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={exportar} className={BOTON}>
        Exportar torneo
      </button>
      <label className={`${BOTON} cursor-pointer`}>
        Importar torneo
        <input type="file" accept="application/json,.json" onChange={importar} className="hidden" />
      </label>
      <button type="button" onClick={nuevo} className={`${BOTON} text-tenue`}>
        Torneo nuevo
      </button>
    </div>
  );
}
