"use client";

import { useEffect, useRef, useState } from "react";

import { etiquetaJornada, rangoBloque, esMadrugada } from "@/lib/horarios";
import { useReservas } from "@/lib/store";
import { CONTACTO } from "@/lib/club";

export function DialogoReserva({
  jornada,
  bloque,
  onCerrar,
}: {
  jornada: string;
  bloque: number;
  onCerrar: () => void;
}) {
  const { solicitar } = useReservas();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [mandando, setMandando] = useState(false);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primerCampo.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    // Que no scrollee la página de atrás mientras el diálogo está abierto.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3) {
      setError("Decinos tu nombre para saber a quién le guardamos la cancha.");
      return;
    }
    if (telefono.replace(/\D/g, "").length < 8) {
      setError("Necesitamos un teléfono válido para confirmarte por WhatsApp.");
      return;
    }
    setMandando(true);
    const r = await solicitar({ jornada, bloque, nombre, telefono, nota });
    setMandando(false);
    if (!r.ok) {
      setError(r.motivo ?? "No pudimos tomar el pedido.");
      return;
    }
    setError(null);
    setEnviado(true);
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
        aria-labelledby="titulo-reserva"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-borde bg-carbon p-6 shadow-2xl sm:rounded-2xl"
      >
        {enviado ? (
          <div className="text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-marino/30 text-2xl">
              ✓
            </div>
            <h2 id="titulo-reserva" className="text-xl font-semibold text-hueso">
              Pedido enviado
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tenue">
              Te guardamos el{" "}
              <strong className="text-hueso">{etiquetaJornada(jornada)}</strong> de{" "}
              <strong className="text-hueso">{rangoBloque(bloque)}</strong>. El
              encargado lo confirma y te avisa por WhatsApp al {telefono}.
            </p>
            <p className="mt-2 text-xs text-tenue">
              Mientras tanto el horario queda reservado para vos.
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
                Pedir turno
              </p>
              <h2
                id="titulo-reserva"
                className="mt-1 text-xl font-semibold text-hueso"
              >
                {etiquetaJornada(jornada)}
              </h2>
              <p className="mt-1 text-bordo-2">
                {rangoBloque(bloque)}
                {esMadrugada(bloque) && (
                  <span className="ml-2 text-xs text-tenue">
                    (arranca pasada la medianoche)
                  </span>
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

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-tenue">Algo que quieras avisar (opcional)</span>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder="Somos 12, ¿hay vestuario libre?"
                  className={`${campo} resize-none`}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-bordo-2">
                {error}
              </p>
            )}

            <p className="mt-4 text-xs leading-relaxed text-tenue">
              No se paga nada ahora. El encargado revisa el pedido y te confirma por
              WhatsApp. Si preferís, escribile directo al {CONTACTO.telefono}.
            </p>

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
                disabled={mandando}
                className="flex-1 rounded-lg bg-bordo px-4 py-3 font-semibold text-hueso transition-colors hover:bg-bordo-2 disabled:opacity-60"
              >
                {mandando ? "Pidiendo…" : "Pedir turno"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
