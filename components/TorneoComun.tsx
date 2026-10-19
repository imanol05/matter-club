"use client";

/** Piezas que comparten las pantallas del torneo. */

import { NOMBRE_RONDA, marcador, type PartidoTorneo, type Torneo } from "@/lib/torneo";

export const BOTON =
  "rounded-xl border border-borde bg-carbon-2 px-3 py-2 text-sm font-semibold text-hueso transition hover:border-hueso/40 active:scale-95 disabled:opacity-40";
export const CAMPO =
  "min-w-0 rounded-xl border border-borde bg-noche px-3 py-2 text-sm text-hueso placeholder:text-tenue focus:border-marino-2 focus:outline-none";

export type PropsTorneo = {
  torneo: Torneo;
  setTorneo: React.Dispatch<React.SetStateAction<Torneo>>;
};

/** Un partido en una lista: quiénes juegan, cómo va y el botón para abrirlo. */
export function FilaPartido({
  torneo,
  partido,
  onAbrir,
  onBorrar,
}: {
  torneo: Torneo;
  partido: PartidoTorneo;
  onAbrir: () => void;
  onBorrar?: () => void;
}) {
  const m = marcador(torneo, partido);
  const empezado = partido.acciones.length > 0;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-borde bg-noche/60 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {m.nombres.local} <span className="text-tenue">vs</span> {m.nombres.visita}
        </p>
        <p className="text-xs text-tenue">
          {partido.ronda ? `${NOMBRE_RONDA[partido.ronda]} · ` : ""}
          Al mejor de {partido.setsParaGanar * 2 - 1} · Sets {m.sets.local}–{m.sets.visita}
          {m.jugados.length > 0 && ` (${m.jugados.map((s) => `${s.local}-${s.visita}`).join(", ")})`}
          {" · "}
          {m.ganador ? `Ganó ${m.nombres[m.ganador]}` : empezado ? "En juego" : "Sin empezar"}
        </p>
      </div>
      <button type="button" onClick={onAbrir} className={BOTON}>
        {m.ganador ? "Ver" : empezado ? "Seguir" : "Jugar"}
      </button>
      {onBorrar && (
        <button type="button" onClick={onBorrar} className="text-xs text-tenue hover:text-bordo-2">
          Borrar
        </button>
      )}
    </li>
  );
}
