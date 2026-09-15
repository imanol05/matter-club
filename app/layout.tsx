import type { Metadata, Viewport } from "next";
import { Outfit, Dancing_Script } from "next/font/google";

import "./globals.css";
import { AvisoDemo } from "@/components/AvisoDemo";

const display = Outfit({
  variable: "--fuente-display",
  subsets: ["latin"],
});

// Solo para el wordmark: imita la firma del logo.
const firma = Dancing_Script({
  variable: "--fuente-firma",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Matter Club · Reservá tu cancha de vóley",
  description:
    "Turnero online de Matter Club. Mirá los horarios libres de la semana y pedí tu turno de 2 horas sin llamar a nadie.",
  // Mientras sea una demo con datos sin confirmar, que no la indexe Google:
  // no queremos que una tarifa provisoria aparezca al buscar "Matter vóley".
  // Se saca junto con <AvisoDemo /> cuando el club apruebe el contenido.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#090c12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${display.variable} ${firma.variable} h-full antialiased`}
    >
      <body className="font-display flex min-h-full flex-col">
        <AvisoDemo />
        {children}
      </body>
    </html>
  );
}
