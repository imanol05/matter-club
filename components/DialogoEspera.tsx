"use client";

import { useEffect, useRef, useState } from "react";

import { etiquetaJornada, rangoBloque } from "@/lib/horarios";
import { useReservas } from "@/lib/store";

/**
 * Anotarse para que avisen si un horario ocupado se libera.
 *
 * Es la respuesta a lo que hoy termina en "bueno, avisame si se cae alguien":
 * queda anotado y el encargado lo ve sin tener que acordarse.
 */
export function DialogoEspera({
  jornada,
  bloque,
  onCerrar,
}: {
  jornada: string;
  bloque: number;
  onCerrar: () => void;
}) {
  const { anotarEnEspera, contarEsperas } = useReservas();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [anotado, setAnotado] = useState(false);
  const primerCampo = useRef<HTMLInputElement>(null);

  const delante = contarEsperas(jornada, bloque);

  useEffect(() => {
    primerCampo.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3) {
      setError("Decinos tu nombre para poder avisarte.");
      return;
    }
    if (telefono.replace(/\D/g, "").length < 8) {
      setError("Necesitamos un teléfono válido para avisarte por WhatsApp.");
      return;
    }
    anotarEnEspera({ jornada, bloque, nombre, telefono });
    setError(null);
    setAnotado(true);
  };

  const campo =
    "w-full rounded-lg border border-borde bg-noche px-3 py-2.5 text-hueso placeholder:text-tenue/60 focus:border-marino-2 focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-noche/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-espera"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-borde bg-carbon p-6 shadow-2xl sm:rounded-2xl"
      >
        {anotado ? (
          <div className="text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-marino/30 text-2xl">
              ✓
            </div>
            <h2 id="titulo-espera" className="text-xl font-semibold text-hueso">
              Quedaste anotado
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tenue">
              Si se libera el{" "}
              <strong className="text-hueso">{etiquetaJornada(jornada)}</strong> de{" "}
              <strong className="text-hueso">{rangoBloque(bloque)}</strong>, te
              escribimos por WhatsApp al {telefono}.
            </p>
            <p className="mt-2 text-xs text-tenue">
              No te reserva el horario: si se libera, el primero que conteste se lo
              queda.
            </p>
            <button
              type="button"
              onClick={onCerrar}
              className="mt-6 w-full rounded-lg bg-bordo px-4 py-3 font-semibold text-hueso transition-colors hover:bg-bordo-2"
            >
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wider text-tenue">
                Horario ocupado
              </p>
              <h2 id="titulo-espera" className="mt-1 text-xl font-semibold text-hueso">
                {etiquetaJornada(jornada)}
              </h2>
              <p className="mt-1 text-bordo-2">{rangoBloque(bloque)}</p>
              <p className="mt-3 text-sm leading-relaxed text-tenue">
                Este turno ya está tomado, pero podemos avisarte si se libera.
                {delante > 0 && (
                  <>
                    {" "}
                    Hay{" "}
                    <strong className="text-hueso">
                      {delante} {delante === 1 ? "persona anotada" : "personas anotadas"}
                    </strong>{" "}
                    antes que vos.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-tenue">Tu nombre o el del equipo</span>
                <input
                  ref={primerCampo}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Los Pumas VC"
                  className={campo}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-tenue">WhatsApp</span>
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

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCerrar}
                className="flex-1 rounded-lg border border-borde px-4 py-3 text-tenue transition-colors hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-marino px-4 py-3 font-semibold text-hueso transition-colors hover:bg-marino-2"
              >
                Avisame si se libera
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
