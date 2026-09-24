import Image from "next/image";

import logo from "@/public/logo.png";

/**
 * Marca de Matter para la barra y el pie.
 *
 * Es el logo original del club con el fondo negro quitado, así se apoya sobre
 * el fondo de la página sin dejar un cuadrado alrededor.
 *
 * Lleva el nombre escrito al lado aunque el logo ya lo diga adentro: a 40px la
 * firma no se llega a leer y el club quedaría sin nombre en toda la barra. El
 * texto va en la tipografía de la interfaz y no en cursiva, para acompañar al
 * logo en vez de competirle.
 */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src={logo} alt="" aria-hidden="true" className="h-10 w-auto" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-wide text-hueso">Matter</span>
        <span className="mt-0.5 text-[0.6rem] font-medium tracking-[0.34em] text-tenue uppercase">
          Club
        </span>
      </span>
    </span>
  );
}

/** El mismo logo en grande, para la portada. */
export function Emblema({ className = "" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="Matter Club"
      priority
      sizes="(min-width: 640px) 18rem, 14rem"
      className={`h-auto w-full ${className}`}
    />
  );
}

/**
 * Sólo el emblema, sin el texto, para espacios chicos donde la firma no se
 * llegaría a leer.
 *
 * Recorta el logo dejando el trazo circular: a 56px, "Matter Club" escrito
 * adentro queda ilegible y ensucia más de lo que aporta.
 */
export function Anillo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block overflow-hidden rounded-full ${className}`}
      role="presentation"
    >
      <Image src={logo} alt="" aria-hidden="true" className="size-full object-cover" />
    </span>
  );
}
