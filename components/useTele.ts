"use client";

/**
 * El lado del celu del enlace con la tele (ver lib/enlace.ts): manda cada
 * punto y contesta a las teles que llegan. Lo usan el tablero y la carga de
 * partidos del torneo, que le muestran a la tele el mismo marcador.
 */

import { useEffect, useRef, useState } from "react";

import type { AnuncioActivo } from "./MarcadorVoley";
import { CADA_CUANTO_SALUDA_MS, abrirEnlace, type Enlace, type MensajeTablero } from "@/lib/enlace";
import type { Partido } from "@/lib/tablero";

/** Si la tele no saluda en este tiempo, se la da por desconectada. */
const TELE_PERDIDA_MS = CADA_CUANTO_SALUDA_MS * 3;

/** Devuelve si hay una tele mirando ahora. */
export function useTele(tele: string | null, partido: Partido, anuncio: AnuncioActivo | null): boolean {
  const [teleVista, setTeleVista] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const enlace = useRef<Enlace | null>(null);
  const ultimo = useRef<{ partido: Partido; anuncio: AnuncioActivo | null }>(null);

  useEffect(() => {
    ultimo.current = { partido, anuncio };
  }, [partido, anuncio]);

  useEffect(() => {
    if (!tele) return;

    /**
     * A una tele que recién llega se le manda el partido, pero no un ace de
     * hace un rato: sólo el cartel de fin de partido, que es el que se queda.
     */
    const responder = () => {
      const u = ultimo.current;
      if (!u) return;
      enlace.current?.enviar({
        tipo: "estado",
        motivo: "respuesta",
        partido: u.partido,
        anuncio: u.anuncio?.resultado.tipo === "partido" ? u.anuncio : null,
      });
    };
    const recibir = (m: MensajeTablero) => {
      if (m.tipo !== "hola") return;
      const t = Date.now();
      setTeleVista(t);
      setAhora(t);
      responder();
    };

    // Al conectarse, el celu manda el partido y pregunta si hay teles: las que
    // estén saludan, y así se sabe en el acto que hay una mirando.
    enlace.current = abrirEnlace(tele, recibir, () => {
      responder();
      enlace.current?.enviar({ tipo: "llamado" });
    });
    return () => {
      enlace.current?.cerrar();
      enlace.current = null;
      setTeleVista(null);
    };
  }, [tele]);

  // Cada punto sale para la tele en el momento.
  useEffect(() => {
    enlace.current?.enviar({ tipo: "estado", motivo: "cambio", partido, anuncio });
  }, [partido, anuncio]);

  useEffect(() => {
    if (!tele) return;
    const t = setInterval(() => setAhora(Date.now()), 3000);
    return () => clearInterval(t);
  }, [tele]);

  return teleVista !== null && ahora - teleVista < TELE_PERDIDA_MS;
}
