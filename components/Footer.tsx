import Link from "next/link";

import { Marca } from "./Marca";
import { CONTACTO } from "@/lib/club";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-borde/70 bg-carbon/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Marca />
          <p className="mt-4 text-sm leading-relaxed text-tenue">
            Cancha de vóley en {CONTACTO.ciudad}. Turnos de 2 horas, todos los días
            de {CONTACTO.horario}.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-semibold text-hueso">Navegación</p>
          <Link href="/turnos" className="text-tenue transition-colors hover:text-hueso">
            Ver turnos
          </Link>
          <Link href="/#cancha" className="text-tenue transition-colors hover:text-hueso">
            La cancha
          </Link>
          <Link href="/#ubicacion" className="text-tenue transition-colors hover:text-hueso">
            Cómo llegar
          </Link>
          <Link href="/admin" className="text-tenue transition-colors hover:text-hueso">
            Panel del encargado
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-semibold text-hueso">Contacto</p>
          <a
            href={CONTACTO.whatsappUrl}
            className="text-tenue transition-colors hover:text-hueso"
          >
            WhatsApp {CONTACTO.telefono}
          </a>
          <a
            href={CONTACTO.instagramUrl}
            className="text-tenue transition-colors hover:text-hueso"
          >
            {CONTACTO.instagram}
          </a>
          <span className="text-tenue">{CONTACTO.direccion}</span>
        </div>
      </div>

      <div className="border-t border-borde/50 px-4 py-5 text-center text-xs text-tenue sm:px-6">
        © {new Date().getFullYear()} Matter Club · Todos los derechos reservados
      </div>
    </footer>
  );
}
