"use client";

/**
 * El torneo: se cargan los equipos con sus jugadores, se arma el fixture, se
 * anota cada partido jugada por jugada (TorneoPartido.tsx) y al final salen
 * los premios.
 *
 * Todo vive en el navegador (`localStorage`), igual que el tablero: no hace
 * falta internet en la cancha. Para no depender de un solo celu se puede
 * exportar el torneo a un archivo y abrirlo en otro.
 */

import { useEffect, useMemo, useState } from "react";

import { Anillo } from "./Marca";
import { useEnNavegador } from "./MarcadorVoley";
import { BOTON, CAMPO, FilaPartido, type PropsTorneo as Props } from "./TorneoComun";
import { VistaFixture } from "./TorneoFixture";
import { CargaPartido } from "./TorneoPartido";
import {
  FUNDAMENTOS,
  NOMBRE_RONDA,
  PUESTOS,
  esTorneo,
  estadisticas,
  minimoRecepciones,
  nombreEquipo,
  normalizar,
  nuevoId,
  premios,
  torneoNuevo,
  type Equipo,
  type Estadistica,
  type Jugador,
  type PartidoTorneo,
  type Puesto,
  type Torneo as DatosTorneo,
} from "@/lib/torneo";

const CLAVE = "matter:torneo";

type Vista = "equipos" | "fixture" | "partidos" | "premios";

function leerGuardado(): DatosTorneo {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const t = JSON.parse(crudo);
      if (esTorneo(t)) return normalizar(t);
    }
  } catch {
    // Navegación privada o dato roto: arrancamos de cero.
  }
  return torneoNuevo();
}

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
        onCambiar={(f) =>
          setTorneo((t) => ({
            ...t,
            partidos: t.partidos.map((p) => (p.id === partido.id ? f(p) : p)),
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
            ["fixture", "Fixture"],
            ["partidos", "Partidos"],
            ["premios", "Premios"],
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
          {vista === "fixture" && <VistaFixture torneo={torneo} setTorneo={setTorneo} onAbrir={setAbierto} />}
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
    onCambiar((eq) => ({
      ...eq,
      jugadores: eq.jugadores.filter((j) => j.id !== id),
      liberoId: eq.liberoId === id ? undefined : eq.liberoId,
    }));
  };

  // Corregir nombre o número no toca las jugadas: van atadas al id, no al nombre.
  const corregir = (id: string, cambio: Partial<Jugador>) =>
    onCambiar((eq) => ({ ...eq, jugadores: eq.jugadores.map((j) => (j.id === id ? { ...j, ...cambio } : j)) }));

  // Uno solo por equipo: marcar a otro le saca la marca al anterior.
  const marcarLibero = (id: string) =>
    onCambiar((eq) => ({ ...eq, liberoId: eq.liberoId === id ? undefined : id }));

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
            <input
              value={j.numero}
              onChange={(e) => corregir(j.id, { numero: e.target.value })}
              placeholder="N°"
              inputMode="numeric"
              aria-label={`Número de ${j.nombre}`}
              className="w-10 rounded-md bg-transparent px-1 text-right font-bold text-tenue tabular-nums focus:bg-carbon-2 focus:text-hueso focus:outline-none"
            />
            <input
              value={j.nombre}
              onChange={(e) => corregir(j.id, { nombre: e.target.value })}
              aria-label="Nombre del jugador"
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 focus:bg-carbon-2 focus:outline-none"
            />
            <select
              value={j.puesto ?? ""}
              onChange={(e) => corregir(j.id, { puesto: (e.target.value || undefined) as Puesto | undefined })}
              aria-label={`Posición de ${j.nombre}`}
              className="w-16 shrink-0 rounded-md bg-transparent px-1 py-0.5 text-xs text-tenue focus:bg-carbon-2 focus:text-hueso focus:outline-none"
            >
              <option value="">Posición</option>
              {PUESTOS.map((p) => (
                <option key={p.clave} value={p.clave}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => marcarLibero(j.id)}
              aria-pressed={equipo.liberoId === j.id}
              title="Marcar como líbero"
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                equipo.liberoId === j.id ? "bg-emerald-500/20 text-emerald-400" : "text-tenue hover:text-hueso"
              }`}
            >
              L
            </button>
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
      {equipo.liberoId && (
        <p className="mt-1 text-xs text-tenue">
          Líbero: {equipo.jugadores.find((j) => j.id === equipo.liberoId)?.nombre}
        </p>
      )}

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

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!local || !visita || local === visita) return;
    const p: PartidoTorneo = {
      id: nuevoId(),
      local,
      visita,
      setsParaGanar: torneo.setsParaGanar,
      creado: Date.now(),
      acciones: [],
    };
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
      <label className="flex flex-wrap items-center gap-2 text-sm text-tenue">
        Los partidos se juegan
        <select
          value={torneo.setsParaGanar}
          onChange={(e) => setTorneo((t) => ({ ...t, setsParaGanar: Number(e.target.value) === 3 ? 3 : 2 }))}
          className={CAMPO}
        >
          <option value={2}>al mejor de 3 sets</option>
          <option value={3}>al mejor de 5 sets</option>
        </select>
        <span className="text-xs">(vale para los partidos nuevos)</span>
      </label>

      <p className="text-sm text-tenue">
        Los partidos del torneo se arman en Fixture. Acá también se puede jugar uno suelto (un amistoso, un
        desempate); sus estadísticas cuentan para los premios igual.
      </p>
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
        <button type="submit" disabled={!local || !visita || local === visita} className={BOTON}>
          Empezar partido
        </button>
      </form>

      {torneo.partidos.length === 0 && <p className="text-sm text-tenue">Todavía no hay partidos.</p>}

      <ul className="space-y-2">
        {[...torneo.partidos].reverse().map((p) => (
          <FilaPartido
            key={p.id}
            torneo={torneo}
            partido={p}
            onAbrir={() => onAbrir(p.id)}
            // Los del fixture se borran desde el fixture, todos juntos.
            onBorrar={p.ronda ? undefined : () => borrar(p)}
          />
        ))}
      </ul>
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
            {p.ronda ? `${NOMBRE_RONDA[p.ronda]}: ` : ""}
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
        no se anotaron todas sus jugadas, conviene mirar la tabla antes de entregar. Para el premio a la
        recepción hay que haber recibido al menos un tercio de las pelotas que recibió el que más recibió
        (ahora, {minimoRecepciones(stats)}).
      </p>
    </div>
  );
}

/** Las columnas de cada fundamento. La recepción se resume en promedio y total. */
const COLUMNAS = FUNDAMENTOS.map((f) => ({
  ...f,
  columnas:
    f.clave === "recepcion"
      ? [
          { titulo: "Prom", valor: (e: Estadistica) => e.promedioRecepcion?.toFixed(2) ?? "–" },
          { titulo: "Tot", valor: (e: Estadistica) => String(e.recepciones) },
        ]
      : f.tipos.map((t) => ({ titulo: t.corta, valor: (e: Estadistica) => String(e.conteo[f.clave][t.clave]) })),
}));

function TablaEstadisticas({ stats }: { stats: Estadistica[] }) {
  const ordenadas = [...stats].sort((a, b) => b.puntos - a.puntos);
  const celda = "px-2 py-1 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-2xl border border-borde">
      <table className="w-full min-w-[900px] text-sm">
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
            {COLUMNAS.map((f) => (
              <th key={f.clave} className="border-l border-borde px-2 pt-1 text-center" colSpan={f.columnas.length}>
                {f.etiqueta}
              </th>
            ))}
          </tr>
          <tr>
            {COLUMNAS.flatMap((f) =>
              f.columnas.map((c, i) => (
                <th key={`${f.clave}-${c.titulo}`} className={`${celda} ${i === 0 ? "border-l border-borde" : ""}`}>
                  {c.titulo}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((e) => (
            <tr key={e.jugador.id} className="border-t border-borde">
              <td className="px-2 py-1">
                <span className="font-semibold">{e.jugador.nombre}</span>{" "}
                <span className="text-xs text-tenue">{e.equipo.nombre}</span>
              </td>
              <td className={`${celda} font-bold`}>{e.puntos}</td>
              <td className={celda}>{e.errores}</td>
              {COLUMNAS.flatMap((f) =>
                f.columnas.map((c, i) => (
                  <td key={`${f.clave}-${c.titulo}`} className={`${celda} ${i === 0 ? "border-l border-borde" : ""}`}>
                    {c.valor(e)}
                  </td>
                )),
              )}
            </tr>
          ))}
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
      if (confirm(`¿Reemplazar el torneo actual por "${t.nombre}"?`)) setTorneo(normalizar(t));
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
