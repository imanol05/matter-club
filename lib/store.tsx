"use client";

/**
 * Puente entre el almacén (lib/almacen.ts) y las pantallas.
 *
 * Es lo único que consumen los componentes.
 */

import { useMemo, useSyncExternalStore } from "react";

import * as almacen from "./almacen";
import type { Espera, Reserva, TurnoFijo } from "./tipos";
import { claveFecha, idSlot } from "./horarios";

export function useReservas() {
  const datos = useSyncExternalStore(
    almacen.suscribir,
    almacen.instantanea,
    almacen.instantaneaServidor,
  );

  /** Quién tiene tomado cada bloque, contando los fijos ya resueltos. */
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
      .map((f) => f.completo)
      .filter((f): f is TurnoFijo => Boolean(f))
      .filter((f) => f.hasta === null || f.hasta >= hoy)
      .sort((a, b) => a.diaSemana - b.diaSemana || a.bloque - b.bloque);
  }, [datos]);

  /**
   * Anotados en lista de espera, marcando cuáles ya se pueden avisar.
   * Se descartan los de horarios que ya pasaron: avisar por algo de ayer no
   * sirve y sólo ensucia el panel.
   */
  const esperas = useMemo(() => {
    const hoy = claveFecha(new Date());
    return datos.esperas
      .filter((e: Espera) => e.jornada >= hoy)
      .map((e: Espera) => ({ ...e, libre: !ocupacionDe(e.jornada, e.bloque) }))
      .sort(
        (a, b) =>
          Number(b.libre) - Number(a.libre) || a.jornada.localeCompare(b.jornada),
      );
  }, [datos, ocupacionDe]);

  /** Cuántos esperan por cada celda. Siempre 0 para el público, que no ve la lista. */
  const contarEsperas = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const e of datos.esperas) {
      const clave = idSlot(e.jornada, e.bloque);
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
    return (jornada: string, bloque: number) => cuenta.get(idSlot(jornada, bloque)) ?? 0;
  }, [datos]);

  return {
    /** false mientras la primera carga está en curso. */
    listo: !datos.cargando,
    error: datos.error,
    /** true si estamos viendo las tablas completas (o sea, el encargado). */
    completo: datos.completo,
    datos,
    ocupacionDe,
    pendientes,
    fijosVigentes,
    esperas,
    contarEsperas,
    recargar: almacen.recargar,
    solicitar: almacen.solicitar,
    confirmar: almacen.confirmar,
    rechazar: almacen.rechazar,
    eliminar: almacen.eliminar,
    bloquear: almacen.bloquear,
    crearFijo: almacen.crearFijo,
    darDeBajaFijo: almacen.darDeBajaFijo,
    anotarEnEspera: almacen.anotarEnEspera,
    quitarEspera: almacen.quitarEspera,
  };
}
