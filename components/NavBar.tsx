"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Marca } from "./Marca";

const ENLACES = [
  { href: "/#cancha", texto: "La cancha" },
  { href: "/turnos", texto: "Turnos" },
  { href: "/#tarifas", texto: "Tarifas" },
  { href: "/#ubicacion", texto: "Ubicación" },
];

export function NavBar() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-borde/70 bg-noche/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={() => setAbierto(false)}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bordo-2"
        >
          <Marca />
          <span className="sr-only">Matter Club — inicio</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-carbon-2 hover:text-hueso ${
                ruta === e.href ? "text-hueso" : "text-tenue"
              }`}
            >
              {e.texto}
            </Link>
          ))}
          <Link
            href="/turnos"
            className="ml-2 rounded-lg bg-bordo px-4 py-2 text-sm font-semibold text-hueso transition-colors hover:bg-bordo-2"
          >
            Reservar turno
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          className="rounded-lg border border-borde p-2 text-tenue transition-colors hover:text-hueso md:hidden"
        >
          <span className="sr-only">{abierto ? "Cerrar menú" : "Abrir menú"}</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {abierto ? (
              <>
                <path d="M5 5l14 14" />
                <path d="M19 5L5 19" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {abierto && (
        <div id="menu-movil" className="border-t border-borde/70 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {ENLACES.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                onClick={() => setAbierto(false)}
                className="rounded-lg px-3 py-3 text-tenue transition-colors hover:bg-carbon-2 hover:text-hueso"
              >
                {e.texto}
              </Link>
            ))}
            <Link
              href="/turnos"
              onClick={() => setAbierto(false)}
              className="mt-2 rounded-lg bg-bordo px-4 py-3 text-center font-semibold text-hueso"
            >
              Reservar turno
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
