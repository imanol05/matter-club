"use client";

/**
 * La tele: sólo muestra. No tiene botones ni guarda el partido; todo lo manda
 * el celu que la controla (ver lib/enlace.ts).
 *
 * Mientras nadie se conectó, muestra en grande el código para enlazarla. El
 * código se guarda en el navegador de la tele, así que si se recarga sigue
 * siendo el mismo y el celu no tiene que volver a escribirlo.
 */

import { useEffect, useRef, useState } from "react";

import {
  Anuncio,
  Cabecera,
  Mitad,
  Pie,
  duracionAnuncio,
  sacudir,
  useEnNavegador,
  useSinApagar,
  type AnuncioActivo,
} from "./MarcadorVoley";
import { Emblema } from "./Marca";
import {
  CADA_CUANTO_SALUDA_MS,
  abrirEnlace,
  codigoNuevo,
  codigoValido,
  type MensajeTablero,
} from "@/lib/enlace";
import type { Equipo, Partido } from "@/lib/tablero";

const CLAVE_CODIGO = "matter:tablero-tele";

/** Si el celu no aparece en este tiempo, la tele avisa que perdió la señal. */
const SIN_SENAL_MS = CADA_CUANTO_SALUDA_MS * 3;

function leerCodigo(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_CODIGO);
    if (guardado && codigoValido(guardado)) return guardado;
    const nuevo = codigoNuevo();
    localStorage.setItem(CLAVE_CODIGO, nuevo);
    return nuevo;
  } catch {
    return codigoNuevo();
  }
}

export function TableroTele() {
  if (!useEnNavegador()) return <div className="h-dvh bg-noche" />;
  return <TeleViva />;
}

function TeleViva() {
  const [codigo] = useState(leerCodigo);
  const [partido, setPartido] = useState<Partido | null>(null);
  const [anuncio, setAnuncio] = useState<AnuncioActivo | null>(null);
  const [ultimaSenal, setUltimaSenal] = useState(0);
  const [ahora, setAhora] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const ultimoAnuncio = useRef<number | null>(null);

  useSinApagar();

  useEffect(() => {
    const recibir = (m: MensajeTablero) => {
      if (m.tipo === "llamado") enlace.enviar({ tipo: "hola" });
      if (m.tipo !== "estado") return;
      setPartido(m.partido);
      setUltimaSenal(Date.now());
      if (m.anuncio && m.anuncio.id !== ultimoAnuncio.current) {
        ultimoAnuncio.current = m.anuncio.id;
        setAnuncio(m.anuncio);
        if (m.anuncio.resultado.tipo === "jugada") {
          sacudir(raiz.current, m.anuncio.resultado.jugada);
        }
      } else if (!m.anuncio && m.motivo === "cambio") {
        setAnuncio(null);
      }
    };

    const enlace = abrirEnlace(codigo, recibir, () => enlace.enviar({ tipo: "hola" }));
    const saludo = setInterval(() => enlace.enviar({ tipo: "hola" }), CADA_CUANTO_SALUDA_MS);
    return () => {
      clearInterval(saludo);
      enlace.cerrar();
    };
  }, [codigo]);

  // Reloj para el aviso de "sin señal".
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!anuncio) return;
    const ms = duracionAnuncio(anuncio.resultado);
    if (ms === null) return;
    const t = setTimeout(() => setAnuncio(null), ms);
    return () => clearTimeout(t);
  }, [anuncio]);

  if (!partido) return <Espera codigo={codigo} />;

  const sinSenal = ahora - ultimaSenal > SIN_SENAL_MS;
  const orden: Equipo[] = partido.invertido ? ["visita", "local"] : ["local", "visita"];

  return (
    <div
      ref={raiz}
      className="fondo-halos relative flex h-dvh cursor-none flex-col overflow-hidden bg-noche select-none"
    >
      <Cabecera partido={partido}>
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm tracking-[0.3em] ${
            sinSenal ? "border-bordo-2 text-bordo-2" : "border-borde text-tenue"
          }`}
        >
          <span className={`size-2 rounded-full ${sinSenal ? "bg-bordo-2" : "bg-emerald-400"}`} />
          {sinSenal ? "Sin señal" : codigo}
        </span>
      </Cabecera>

      <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 px-3 pb-1 sm:gap-6 sm:px-6">
        {orden.map((e) => (
          <Mitad key={e} partido={partido} equipo={e} />
        ))}
      </main>

      <Pie partido={partido} />

      {anuncio && <Anuncio key={anuncio.id} resultado={anuncio.resultado} partido={partido} />}
    </div>
  );
}

function Espera({ codigo }: { codigo: string }) {
  const direccion = `${window.location.host}/tablero`;

  return (
    <div className="fondo-halos flex h-dvh flex-col items-center justify-center gap-[4vh] bg-noche p-6 text-center select-none">
      <Emblema className="max-w-[22vh]" />
      <div>
        <p className="text-[2.6vh] tracking-[0.4em] text-tenue uppercase">Código de esta tele</p>
        <p className="tablero-golpe mt-[1vh] font-mono text-[20vh] leading-none font-black tracking-[0.15em] text-hueso">
          {codigo}
        </p>
      </div>
      <p className="max-w-[80vw] text-[3vh] leading-snug text-tenue">
        En el celu entrá a <span className="font-semibold text-hueso">{direccion}</span>, tocá{" "}
        <span className="font-semibold text-hueso">Tele</span> y escribí el código.
      </p>
    </div>
  );
}
