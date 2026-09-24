"use client";

import { useState, type ReactNode } from "react";

import { entrar, salir, useSesion } from "@/lib/sesion";
import { hayBackend } from "@/lib/supabase";
import { Anillo } from "./Marca";

/**
 * Deja pasar al panel sólo a quien está en la tabla `encargados`.
 *
 * No alcanza con tener sesión: un usuario logueado que no esté en esa tabla ve
 * el aviso de "no tenés permiso" y, sobre todo, tampoco podría hacer nada si
 * forzara la pantalla — las políticas RLS de la base usan la misma función
 * es_encargado() que consulta este componente.
 */
export function PuertaEncargado({ children }: { children: ReactNode }) {
  const { cargando, usuario, esEncargado } = useSesion();

  if (!hayBackend) {
    return (
      <Cartel titulo="Falta configurar el servidor">
        No hay credenciales de Supabase cargadas. Copiá{" "}
        <code className="text-hueso">.env.local.example</code> a{" "}
        <code className="text-hueso">.env.local</code> y completalas.
      </Cartel>
    );
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-sm animate-pulse py-10">
        <div className="h-64 rounded-2xl bg-carbon" />
        <span className="sr-only">Verificando la sesión…</span>
      </div>
    );
  }

  if (!usuario) return <Ingreso />;

  if (esEncargado === false) {
    return (
      <Cartel titulo="Esta cuenta no tiene acceso">
        Entraste como <strong className="text-hueso">{usuario.email}</strong>, pero
        esa cuenta no figura como encargada del club. Si tendría que tenerlo,
        pedile al administrador que te dé de alta.
        <button
          type="button"
          onClick={() => void salir()}
          className="mt-5 w-full rounded-lg border border-borde px-4 py-2.5 text-sm text-tenue transition-colors hover:border-bordo-2 hover:text-hueso"
        >
          Salir
        </button>
      </Cartel>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-carbon px-4 py-3">
        <p className="text-sm text-tenue">
          Sesión de <strong className="text-hueso">{usuario.email}</strong>
        </p>
        <button
          type="button"
          onClick={() => void salir()}
          className="rounded-lg border border-borde px-3 py-1.5 text-xs text-tenue transition-colors hover:border-bordo-2 hover:text-hueso"
        >
          Cerrar sesión
        </button>
      </div>
      {children}
    </>
  );
}

function Ingreso() {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const r = await entrar(email, clave);
    if (!r.ok) setError(r.motivo ?? "No pudimos entrar.");
    // Si salió bien no hace falta hacer nada: cambia la sesión y el componente
    // de arriba deja de renderizar este formulario.
    setEntrando(false);
  };

  const campo =
    "w-full rounded-lg border border-borde bg-noche px-3 py-2.5 text-hueso placeholder:text-tenue/60 focus:border-marino-2 focus:outline-none";

  return (
    <div className="mx-auto max-w-sm py-6">
      <form
        onSubmit={enviar}
        className="rounded-2xl border border-borde bg-carbon p-6"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Anillo className="size-14" />
          <h2 className="mt-4 text-lg font-semibold text-hueso">
            Panel del encargado
          </h2>
          <p className="mt-1 text-sm text-tenue">Entrá con tu cuenta del club.</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-tenue">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-tenue">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className={campo}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-bordo-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="mt-5 w-full rounded-lg bg-bordo px-4 py-3 font-semibold text-hueso transition-colors hover:bg-bordo-2 disabled:opacity-60"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Cartel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="rounded-2xl border border-borde bg-carbon p-6 text-center">
        <h2 className="text-lg font-semibold text-hueso">{titulo}</h2>
        <div className="mt-3 text-sm leading-relaxed text-tenue">{children}</div>
      </div>
    </div>
  );
}
