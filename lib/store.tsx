"use client";

/**
 * Puente entre el almacén (lib/almacen.ts) y las pantallas.
 *
 * Es lo único que consumen los componentes: si mañana los datos vienen de
 * Supabase, se cambia acá adentro y nadie más se entera.
 */

import { useMemo, useSyncExternalStore } from "react";

import * as almacen from "./almacen";
import type { Espera, Reserva, TurnoFijo } from "./tipos";
import { claveFecha, idSlot } from "./horarios";

/** Suscripción vacía: `listo` sólo cambia entre servidor y cliente. */
const sinCambios = () => () => {};

export function useReservas() {
  // false durante el render del servidor y la hidratación, true después.
  // Es lo que deja mostrar el esqueleto sin desfasaje de hidratación.
  const listo = useSyncExternalStore(
    sinCambios,
    () => true,
    () => false,
  );

  const datos = useSyncExternalStore(
    almacen.suscribir,
    almacen.instantanea,
    almacen.instantaneaServidor,
  );

  /** Quién tiene tomado cada bloque, contando los fijos ya expandidos. */
  const ocupacionDe = useMemo(() => almacen.crearBuscador(datos), [datos]);

  const pendientes = useMemo(
    () =>
      datos.reservas
        .filter((r: Reserva) => r.estado === "pendiente")
        .sort((a: Reserva, b: Reserva) => a.inicio.localeCompare(b.inicio)),
    [datos],
  );

  /** Fijos vigentes hoy, ordenados como se leen en la grilla. */
  const fijosVigentes = useMemo(() => {
    const hoy = claveFecha(new Date());
    return datos.fijos
      .filter((f: TurnoFijo) => f.hasta === null || f.hasta >= hoy)
      .sort((a, b) => a.diaSemana - b.diaSemana || a.bloque - b.bloque);
  }, [datos]);

  /**
   * Anotados en lista de espera, marcando cuáles ya se pueden avisar.
   * Se descartan los de horarios que ya pasaron: avisar por algo de ayer no
   * sirve, y sólo ensucia el panel.
   */
  const esperas = useMemo(() => {
    const hoy = claveFecha(new Date());
    return datos.esperas
      .filter((e: Espera) => e.jornada >= hoy)
      .map((e: Espera) => ({ ...e, libre: !ocupacionDe(e.jornada, e.bloque) }))
      .sort((a, b) => Number(b.libre) - Number(a.libre) || a.jornada.localeCompare(b.jornada));
  }, [datos, ocupacionDe]);

  const contarEsperas = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const e of datos.esperas) {
      const clave = idSlot(e.jornada, e.bloque);
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
    return (jornada: string, bloque: number) =>
      cuenta.get(idSlot(jornada, bloque)) ?? 0;
  }, [datos]);

  return {
    listo,
    datos,
    ocupacionDe,
    pendientes,
    fijosVigentes,
    esperas,
    contarEsperas,
    solicitar: almacen.solicitar,
    confirmar: almacen.confirmar,
    rechazar: almacen.rechazar,
    eliminar: almacen.eliminar,
    bloquear: almacen.bloquear,
    crearFijo: almacen.crearFijo,
    darDeBajaFijo: almacen.darDeBajaFijo,
    anotarEnEspera: almacen.anotarEnEspera,
    quitarEspera: almacen.quitarEspera,
    reiniciar: almacen.reiniciar,
  };
}
