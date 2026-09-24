"use client";

/**
 * Sesión del encargado.
 *
 * Igual que el almacén de reservas, esto vive fuera de React: la sesión la
 * maneja Supabase, que avisa por su cuenta cuando cambia (login, logout,
 * refresco del token, o el mismo usuario entrando desde otra pestaña).
 * Sincronizar con algo así es para lo que existe useSyncExternalStore.
 *
 * Estar logueado NO alcanza para entrar al panel: hay que estar en la tabla
 * `encargados`. Eso se consulta con la función es_encargado() de la base, que
 * es la misma que usan las políticas RLS — así la pantalla y los permisos
 * reales nunca pueden opinar distinto.
 */

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type EstadoSesion = {
  /** true hasta que sabemos si hay sesión o no. */
  cargando: boolean;
  usuario: User | null;
  /** null mientras se está averiguando. */
  esEncargado: boolean | null;
};

const INICIAL: EstadoSesion = { cargando: true, usuario: null, esEncargado: null };
const SIN_BACKEND: EstadoSesion = {
  cargando: false,
  usuario: null,
  esEncargado: false,
};

let estado: EstadoSesion = INICIAL;
let arrancado = false;
const oyentes = new Set<() => void>();

function publicar(nuevo: EstadoSesion) {
  estado = nuevo;
  for (const o of oyentes) o();
}

async function revisarPermiso(usuario: User | null) {
  if (!usuario || !supabase) {
    publicar({ cargando: false, usuario, esEncargado: false });
    return;
  }
  const { data, error } = await supabase.rpc("es_encargado");
  publicar({
    cargando: false,
    usuario,
    // Ante un error de red preferimos negar: mostrar el panel a quien quizá no
    // corresponde es peor que pedirle que reintente.
    esEncargado: error ? false : Boolean(data),
  });
}

function arrancar() {
  if (arrancado) return;
  arrancado = true;

  if (!supabase) {
    publicar(SIN_BACKEND);
    return;
  }

  supabase.auth.getSession().then(({ data }) => {
    void revisarPermiso(data.session?.user ?? null);
  });

  supabase.auth.onAuthStateChange((_evento, sesion) => {
    void revisarPermiso(sesion?.user ?? null);
  });
}

export function useSesion(): EstadoSesion {
  return useSyncExternalStore(
    (alCambiar) => {
      arrancar();
      oyentes.add(alCambiar);
      return () => {
        oyentes.delete(alCambiar);
      };
    },
    () => estado,
    () => INICIAL,
  );
}

export async function entrar(
  email: string,
  clave: string,
): Promise<{ ok: boolean; motivo?: string }> {
  if (!supabase) return { ok: false, motivo: "Falta configurar el servidor." };

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: clave,
  });
  if (!error) return { ok: true };

  // El mensaje de Supabase viene en inglés y es de los que el usuario lee.
  const traducciones: Record<string, string> = {
    "Invalid login credentials": "Email o contraseña incorrectos.",
    "Email not confirmed": "Ese usuario todavía no confirmó su email.",
  };
  return { ok: false, motivo: traducciones[error.message] ?? error.message };
}

export async function salir() {
  await supabase?.auth.signOut();
}
