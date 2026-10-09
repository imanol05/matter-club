"use client";

/**
 * El cable invisible entre el celu que controla el tablero y la tele que lo
 * muestra.
 *
 * La tele inventa un código corto y lo muestra en grande; el celu lo escribe y
 * desde ahí los dos hablan por un canal con ese nombre. No pasa nada por la
 * base: es Supabase Realtime en modo "broadcast", que reparte mensajes entre
 * los que están conectados y no guarda nada. Por eso no hace falta ninguna
 * tabla ni migración.
 *
 * Además va por BroadcastChannel, que conecta pestañas del mismo navegador sin
 * internet: sirve cuando la tele es una segunda pantalla de la misma compu, y
 * para probar sin Supabase.
 *
 * El celu es el dueño del partido. La tele no guarda nada: cuando llega, saluda
 * ("hola") y el celu le contesta con el estado completo. Sigue saludando cada
 * tanto, y así el celu sabe que hay una tele mirando. Si el que llega es el
 * celu, pregunta si hay alguna tele ("llamado") y las que estén lo saludan.
 */

import { supabase } from "./supabase";
import type { Partido, Resultado } from "./tablero";

export type AnuncioRemoto = { id: number; resultado: Resultado };

export type MensajeTablero =
  /** De la tele: "estoy acá, mandame el partido". */
  | { tipo: "hola" }
  /** Del celu al conectarse: "¿hay alguna tele?". Las teles contestan "hola". */
  | { tipo: "llamado" }
  | {
      tipo: "estado";
      /**
       * "cambio" es un punto recién hecho; "respuesta" es el estado mandado a
       * una tele que acaba de saludar. La diferencia importa para no cortar un
       * festejo que la tele está mostrando.
       */
      motivo: "cambio" | "respuesta";
      partido: Partido;
      anuncio: AnuncioRemoto | null;
    };

export const CADA_CUANTO_SALUDA_MS = 8000;

// Sin 0/O ni 1/I/L: se leen de lejos en una tele y se tipean sin dudar.
const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_CODIGO = 4;

export function codigoNuevo(): string {
  const azar = crypto.getRandomValues(new Uint32Array(LARGO_CODIGO));
  return Array.from(azar, (n) => LETRAS[n % LETRAS.length]).join("");
}

/** Lo que tipeó la persona, en mayúsculas y sin espacios ni guiones. */
export function normalizarCodigo(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LARGO_CODIGO);
}

export function codigoValido(c: string): boolean {
  return c.length === LARGO_CODIGO && [...c].every((l) => LETRAS.includes(l));
}

/**
 * Lo que llega por la red lo puede mandar cualquiera que sepa el código. No se
 * confía en la forma: si no es un mensaje del tablero, se descarta.
 */
function esMensaje(x: unknown): x is MensajeTablero {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  if (m.tipo === "hola" || m.tipo === "llamado") return true;
  if (m.tipo !== "estado") return false;
  const p = m.partido as Partido | undefined;
  return (
    typeof p?.puntos?.local === "number" &&
    typeof p?.puntos?.visita === "number" &&
    typeof p?.sets?.local === "number" &&
    typeof p?.sets?.visita === "number" &&
    typeof p?.nombres?.local === "string" &&
    typeof p?.nombres?.visita === "string" &&
    Array.isArray(p?.jugados)
  );
}

export interface Enlace {
  enviar(m: MensajeTablero): void;
  cerrar(): void;
}

/**
 * Abre el canal del código dado. `alConectar` se llama cada vez que el canal
 * de Supabase queda listo (también al reconectarse después de un corte), que
 * es el momento de saludar o de mandar el estado.
 */
export function abrirEnlace(
  codigo: string,
  alRecibir: (m: MensajeTablero) => void,
  alConectar?: () => void,
): Enlace {
  const recibir = (dato: unknown) => {
    if (esMensaje(dato)) alRecibir(dato);
  };

  const local =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(`matter-tablero:${codigo}`);
  if (local) local.onmessage = (ev) => recibir(ev.data);

  const canal = supabase
    ?.channel(`tablero:${codigo}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "tablero" }, ({ payload }) => recibir(payload))
    .subscribe((estado) => {
      if (estado === "SUBSCRIBED") alConectar?.();
    });

  // BroadcastChannel está listo en el acto.
  queueMicrotask(() => alConectar?.());

  return {
    enviar(m) {
      local?.postMessage(m);
      canal?.send({ type: "broadcast", event: "tablero", payload: m }).catch(() => {});
    },
    cerrar() {
      local?.close();
      if (canal) supabase?.removeChannel(canal);
    },
  };
}
