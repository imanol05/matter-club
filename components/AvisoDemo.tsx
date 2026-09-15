import { CONTACTO } from "@/lib/club";

/**
 * Barra de aviso para la demo publicada.
 *
 * La página lleva el nombre, la dirección y el teléfono reales de Matter, más
 * una tarifa que el club todavía no confirmó. Mientras eso siga así, tiene que
 * quedar claro que no es el sitio oficial: si el link circula, alguien puede
 * llegar acá y creer que reservó de verdad.
 *
 * Cuando Matter apruebe el contenido, se borra este componente de app/layout.tsx
 * y se saca el `robots: noindex` de la misma pantalla.
 */
export function AvisoDemo() {
  return (
    <div className="border-b border-marino-2/40 bg-marino/25 px-4 py-2 text-center text-xs leading-relaxed text-tenue">
      <strong className="text-hueso">Demo de muestra.</strong> No es el sitio
      oficial de {CONTACTO.nombre} — las reservas no son reales y los precios
      están sin confirmar.
    </div>
  );
}
