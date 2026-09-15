/**
 * Marca de Matter Club.
 *
 * Es una reconstrucción en SVG del logo (el trazo bordó circular con la firma
 * adentro) para que escale nítido y se pueda tintar. Cuando tengamos el
 * archivo original en buena resolución, se reemplaza `Anillo` por la imagen y
 * el resto de la app no se entera.
 */

export function Anillo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trazoBordo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-bordo-2)" />
          <stop offset="60%" stopColor="var(--color-bordo)" />
          <stop offset="100%" stopColor="var(--color-bordo-3)" />
        </linearGradient>
      </defs>

      {/* Trazo principal: un círculo abierto, como pintado de una pincelada. */}
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke="url(#trazoBordo)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="228 61"
        transform="rotate(-28 60 60)"
      />
      {/* Segundo trazo, más fino: le da el aire irregular del pincel. */}
      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke="url(#trazoBordo)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="74 165"
        transform="rotate(128 60 60)"
        opacity="0.75"
      />
    </svg>
  );
}

/** Lockup horizontal, para la barra de navegación. */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Anillo className="size-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-firma text-2xl text-hueso">Matter</span>
        <span className="text-[0.62rem] font-semibold tracking-[0.34em] text-tenue uppercase">
          Club
        </span>
      </span>
    </span>
  );
}

/** Emblema grande y centrado, para el hero. */
export function Emblema({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      <Anillo className="size-full" />
      <span className="absolute flex flex-col items-center leading-none">
        <span className="font-firma text-[2.6rem] text-hueso drop-shadow-sm sm:text-5xl">
          Matter
        </span>
        <span className="mt-1 text-[0.6rem] font-semibold tracking-[0.42em] text-tenue uppercase sm:text-xs">
          Club
        </span>
      </span>
    </span>
  );
}
