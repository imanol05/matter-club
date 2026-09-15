"use client";

import { useState } from "react";

import { DIAS_LARGOS, bloques, claveFecha, rangoBloque } from "@/lib/horarios";
import { useReservas } from "@/lib/store";

/** El array de días arranca en domingo; la grilla y los fijos, en lunes. */
const DIAS = [1, 2, 3, 4, 5, 6, 0].map((d, i) => ({
  valor: i,
  nombre: DIAS_LARGOS[d],
}));

/**
 * Alta y baja de turnos fijos semanales.
 *
 * Es lo que hoy vive en la cabeza del encargado ("los martes a las 20 son de
 * Juanma"). Cargarlo una vez lo saca de tener que acordarse y de bloquear el
 * horario a mano todas las semanas.
 */
export function GestorFijos() {
  const { listo, fijosVigentes, crearFijo, darDeBajaFijo } = useReservas();
  const [abierto, setAbierto] = useState(false);
  const [diaSemana, setDiaSemana] = useState(0);
  const [bloque, setBloque] = useState(6);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3) {
      setError("Poné el nombre del grupo o equipo.");
      return;
    }
    const yaExiste = fijosVigentes.some(
      (f) => f.diaSemana === diaSemana && f.bloque === bloque,
    );
    if (yaExiste) {
      setError("Ya hay un turno fijo en ese día y horario.");
      return;
    }
    crearFijo({
      diaSemana,
      bloque,
      nombre,
      telefono,
      desde: claveFecha(new Date()),
    });
    setNombre("");
    setTelefono("");
    setError(null);
    setAbierto(false);
  };

  const campo =
    "w-full rounded-lg border border-borde bg-noche px-3 py-2.5 text-hueso placeholder:text-tenue/60 focus:border-marino-2 focus:outline-none";

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-hueso">Turnos fijos</h2>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-lg border border-borde px-4 py-2 text-sm text-tenue transition-colors hover:border-bordo-2 hover:text-hueso"
        >
          {abierto ? "Cancelar" : "+ Nuevo turno fijo"}
        </button>
      </div>
      <p className="mb-5 text-sm text-tenue">
        Se repiten todas las semanas sin que haya que cargarlos de nuevo.
      </p>

      {abierto && (
        <form
          onSubmit={enviar}
          className="mb-5 rounded-xl border border-borde bg-carbon p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-tenue">Día</span>
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value))}
                className={campo}
              >
                {DIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-tenue">Horario</span>
              <select
                value={bloque}
                onChange={(e) => setBloque(Number(e.target.value))}
                className={campo}
              >
                {bloques.map((b) => (
                  <option key={b} value={b}>
                    {rangoBloque(b)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-tenue">Grupo o equipo</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Los Pumas VC"
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-tenue">WhatsApp de contacto</span>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                inputMode="tel"
                placeholder="351 234 5678"
                className={campo}
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-bordo-2">
              {error}
            </p>
          )}

          <p className="mt-3 text-xs text-tenue">
            Arranca hoy y sigue hasta que lo des de baja. Las reservas sueltas que
            ya estuvieran cargadas en ese horario se respetan.
          </p>

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-bordo px-4 py-2.5 text-sm font-semibold text-hueso transition-colors hover:bg-bordo-2 sm:w-auto"
          >
            Crear turno fijo
          </button>
        </form>
      )}

      {!listo ? (
        <div className="h-20 animate-pulse rounded-xl bg-carbon" />
      ) : fijosVigentes.length === 0 ? (
        <p className="rounded-xl border border-borde bg-carbon px-4 py-6 text-center text-sm text-tenue">
          No hay turnos fijos cargados.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {fijosVigentes.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-bordo/40 bg-bordo/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-hueso">{f.nombre}</p>
                <p className="text-sm text-tenue">
                  {DIAS.find((d) => d.valor === f.diaSemana)?.nombre} ·{" "}
                  {rangoBloque(f.bloque)}
                </p>
                {f.telefono && <p className="text-xs text-tenue">{f.telefono}</p>}
              </div>
              <button
                type="button"
                onClick={() => darDeBajaFijo(f.id)}
                title="El turno de hoy se respeta; deja de repetirse a partir de mañana. Las semanas pasadas no se tocan."
                className="shrink-0 rounded-lg border border-borde px-3 py-2 text-xs text-tenue transition-colors hover:border-bordo hover:text-hueso"
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
