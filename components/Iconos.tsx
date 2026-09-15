/** Iconos de línea para las características de la cancha. */

const TRAZOS: Record<string, React.ReactNode> = {
  piso: (
    <>
      <path d="M3 8h18" />
      <path d="M3 16h18" />
      <path d="M8 4v16" />
      <path d="M16 4v16" />
    </>
  ),
  techo: (
    <>
      <path d="M3 11l9-6 9 6" />
      <path d="M5 11v8h14v-8" />
      <path d="M10 19v-4h4v4" />
    </>
  ),
  bano: (
    <>
      <circle cx="8" cy="5" r="1.6" />
      <path d="M8 8.5c-1.4 0-2.2 1-2.2 2.3V15h1.2v5h2v-5h1.2v-4.2c0-1.3-.8-2.3-2.2-2.3Z" />
      <circle cx="16" cy="5" r="1.6" />
      <path d="M16 8.5c-1.5 0-2.4 1-2.4 2.2L12.8 15h1.4l.3 5h3l.3-5h1.4l-.8-4.3c0-1.2-.9-2.2-2.4-2.2Z" />
    </>
  ),
  quiosco: (
    <>
      <path d="M4 9h16l-1 11H5L4 9Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  /** También hace de ícono por defecto si llega un nombre desconocido. */
  red: (
    <>
      <path d="M4 5v14M20 5v14" />
      <path d="M4 8h16M4 12h16M4 16h16" />
      <path d="M9 8v8M15 8v8" />
    </>
  ),
};

export function Icono({ nombre, className = "" }: { nombre: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZOS[nombre] ?? TRAZOS.red}
    </svg>
  );
}
