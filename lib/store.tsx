"use client";

/**
 * Puente entre el almacén (lib/almacen.ts) y las pantallas.
 *
 * Es lo único que consumen los componentes: si mañana los datos vienen de
 * Supabase, se cambia acá adentro y nadie más se entera.
 */

import { useMemo, useSyncExternalStore } from "react";

import * as almacen from "./almacen";
import type { Reserva } from "./tipos";

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

  const reservas = useSyncExternalStore(
    almacen.suscribir,
    almacen.instantanea,
    almacen.instantaneaServidor,
  );

  const porSlot = useMemo(() => almacen.indexarPorSlot(reservas), [reservas]);

  const pendientes = useMemo(
    () =>
      reservas
        .filter((r: Reserva) => r.estado === "pendiente")
        .sort((a: Reserva, b: Reserva) => a.inicio.localeCompare(b.inicio)),
    [reservas],
  );

  return {
    listo,
    reservas,
    porSlot,
    pendientes,
    solicitar: almacen.solicitar,
    confirmar: almacen.confirmar,
    rechazar: almacen.rechazar,
    eliminar: almacen.eliminar,
    bloquear: almacen.bloquear,
    reiniciar: almacen.reiniciar,
  };
}
