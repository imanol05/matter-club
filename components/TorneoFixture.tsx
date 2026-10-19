"use client";

/**
 * El esquema del torneo de 8 equipos: dos zonas de 4 con todos contra todos,
 * semis cruzadas entre los dos primeros de cada zona, final y 3er puesto.
 * Las reglas están en lib/torneo.ts; acá sólo se arma y se muestra.
 */

import { useState } from "react";

import { BOTON, FilaPartido, type PropsTorneo } from "./TorneoComun";
import {
  EQUIPOS_POR_ZONA,
  NOMBRE_RONDA,
  finales,
  nombreEquipo,
  partidosDeZona,
  posiciones,
  resultadoDe,
  rondaTerminada,
  semifinales,
  type Ronda,
} from "@/lib/torneo";

type Zona = "A" | "B";

export function VistaFixture({ torneo, setTorneo, onAbrir }: PropsTorneo & { onAbrir: (id: string) => void }) {
  if (!torneo.zonas) return <ArmarZonas torneo={torneo} setTorneo={setTorneo} />;

  const delFixture = torneo.partidos.filter((p) => p.ronda);
  const hay = (r: Ronda) => torneo.partidos.some((p) => p.ronda === r);
  const zonasListas = rondaTerminada(torneo, ["zonaA", "zonaB"]);
  const semisListas = rondaTerminada(torneo, ["semi1", "semi2"]);
  const campeon = resultadoDe(torneo, "final");

  const deshacerFixture = () => {
    const jugados = delFixture.filter((p) => p.acciones.length > 0).length;
    const aviso = jugados
      ? `Hay ${jugados} partidos del fixture con jugadas cargadas: se borran todos, con sus estadísticas. ¿Seguro?`
      : "¿Borrar el fixture y volver a armar las zonas?";
    if (!confirm(aviso)) return;
    setTorneo((t) => ({ ...t, zonas: undefined, partidos: t.partidos.filter((p) => !p.ronda) }));
  };

  return (
    <div className="space-y-6">
      {campeon && (
        <p className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-3 text-center font-bold">
          🏆 Campeón: {nombreEquipo(torneo, campeon.ganador)}
        </p>
      )}

      {(["A", "B"] as const).map((z) => (
        <TablaZona key={z} zona={z} torneo={torneo} onAbrir={onAbrir} />
      ))}

      <section className="space-y-2">
        <h3 className="font-bold">Eliminatorias</h3>
        {!hay("semi1") && (
          <>
            <p className="text-sm text-tenue">
              Semifinales: 1° de la zona A contra 2° de la B, y 1° de la B contra 2° de la A. Se arman cuando
              terminan todos los partidos de las zonas.
            </p>
            <button
              type="button"
              disabled={!zonasListas}
              onClick={() => setTorneo((t) => ({ ...t, partidos: [...t.partidos, ...semifinales(t)] }))}
              className={BOTON}
            >
              Armar semifinales
            </button>
          </>
        )}
        {hay("semi1") && !hay("final") && (
          <button
            type="button"
            disabled={!semisListas}
            onClick={() => setTorneo((t) => ({ ...t, partidos: [...t.partidos, ...finales(t)] }))}
            className={BOTON}
          >
            Armar final y 3er puesto
          </button>
        )}
        <ul className="space-y-2">
          {(["semi1", "semi2", "tercero", "final"] as const).flatMap((r) =>
            torneo.partidos
              .filter((p) => p.ronda === r)
              .map((p) => (
                <FilaPartido key={p.id} torneo={torneo} partido={p} onAbrir={() => onAbrir(p.id)} />
              )),
          )}
        </ul>
        {hay("semi1") && !hay("final") && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm("¿Borrar las semifinales para volver a armarlas? Se pierden sus jugadas si ya las tienen.")
              ) {
                setTorneo((t) => ({
                  ...t,
                  partidos: t.partidos.filter((p) => p.ronda !== "semi1" && p.ronda !== "semi2"),
                }));
              }
            }}
            className="text-xs text-tenue underline hover:text-hueso"
          >
            Rehacer semifinales
          </button>
        )}
      </section>

      <button type="button" onClick={deshacerFixture} className="text-xs text-tenue underline hover:text-bordo-2">
        Borrar el fixture
      </button>
    </div>
  );
}

function TablaZona({
  zona,
  torneo,
  onAbrir,
}: {
  zona: Zona;
  torneo: PropsTorneo["torneo"];
  onAbrir: (id: string) => void;
}) {
  const ronda = zona === "A" ? "zonaA" : "zonaB";
  const tabla = posiciones(torneo, ronda);
  const celda = "px-2 py-1 text-right tabular-nums";

  return (
    <section className="space-y-2">
      <h3 className="font-bold">{NOMBRE_RONDA[ronda]}</h3>
      {/* Sólo lo que se lee de un vistazo en el celu: PG, PP y tantos siguen
          contando para el desempate (lib/torneo.ts) pero no entraban en una
          pantalla angosta sin scroll horizontal, y para eso ya está Pts. */}
      <div className="overflow-x-auto rounded-2xl border border-borde">
        <table className="w-full text-sm">
          <thead className="bg-carbon-2 text-xs text-tenue">
            <tr>
              <th className="px-2 py-1 text-left">Equipo</th>
              <th className={celda} title="Puntos">
                Pts
              </th>
              <th className={celda} title="Jugados">
                PJ
              </th>
              <th className={celda} title="Sets a favor y en contra">
                Sets
              </th>
            </tr>
          </thead>
          <tbody>
            {tabla.map((f, i) => (
              <tr key={f.equipo} className={`border-t border-borde ${i < 2 ? "bg-emerald-500/5" : ""}`}>
                <td className="px-2 py-1">
                  <span className="mr-1 text-tenue">{i + 1}.</span>
                  <span className="font-semibold">{nombreEquipo(torneo, f.equipo)}</span>
                </td>
                <td className={`${celda} font-bold`}>{f.puntos}</td>
                <td className={celda}>{f.jugados}</td>
                <td className={celda}>
                  {f.setsAFavor}-{f.setsEnContra}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2">
        {torneo.partidos
          .filter((p) => p.ronda === ronda)
          .map((p) => (
            <FilaPartido key={p.id} torneo={torneo} partido={p} onAbrir={() => onAbrir(p.id)} />
          ))}
      </ul>
    </section>
  );
}

/** Antes del fixture: repartir los 8 equipos en dos zonas, a mano o por sorteo. */
function ArmarZonas({ torneo, setTorneo }: PropsTorneo) {
  const [zona, setZona] = useState<Record<string, Zona>>({});
  const total = EQUIPOS_POR_ZONA * 2;

  if (torneo.equipos.length !== total) {
    return (
      <p className="text-sm text-tenue">
        El fixture es para {total} equipos (dos zonas de {EQUIPOS_POR_ZONA}). Hay {torneo.equipos.length} cargados
        en Equipos.
      </p>
    );
  }

  const en = (z: Zona) => torneo.equipos.filter((e) => zona[e.id] === z).map((e) => e.id);
  const listo = en("A").length === EQUIPOS_POR_ZONA && en("B").length === EQUIPOS_POR_ZONA;

  const sortear = () => {
    const mezclados = [...torneo.equipos].sort(() => Math.random() - 0.5);
    setZona(Object.fromEntries(mezclados.map((e, i) => [e.id, i < EQUIPOS_POR_ZONA ? "A" : "B"])));
  };

  const armar = () => {
    setTorneo((t) => {
      const conZonas = { ...t, zonas: { A: en("A"), B: en("B") } };
      return {
        ...conZonas,
        partidos: [...t.partidos, ...partidosDeZona(conZonas, "zonaA"), ...partidosDeZona(conZonas, "zonaB")],
      };
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-tenue">
        Dos zonas de {EQUIPOS_POR_ZONA}: todos contra todos dentro de la zona. Pasan los dos primeros a semifinales
        cruzadas, y después final y 3er puesto. En la tabla, ganar sin llegar al set decisivo da 3 puntos; ganar en el
        decisivo da 2, y perderlo, 1.
      </p>
      <button type="button" onClick={sortear} className={BOTON}>
        Sortear zonas
      </button>
      <ul className="space-y-1.5">
        {torneo.equipos.map((e) => (
          <li key={e.id} className="flex items-center gap-2">
            <span className="flex-1 truncate">{e.nombre}</span>
            {(["A", "B"] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZona((x) => ({ ...x, [e.id]: z }))}
                className={`w-20 rounded-lg border px-2 py-1 text-sm ${
                  zona[e.id] === z ? "border-hueso bg-carbon-2 text-hueso" : "border-borde text-tenue"
                }`}
              >
                Zona {z}
              </button>
            ))}
          </li>
        ))}
      </ul>
      <p className="text-xs text-tenue">
        Zona A: {en("A").length}/{EQUIPOS_POR_ZONA} · Zona B: {en("B").length}/{EQUIPOS_POR_ZONA}
      </p>
      <button type="button" disabled={!listo} onClick={armar} className={BOTON}>
        Armar fixture
      </button>
    </div>
  );
}
