import type { Metadata, Viewport } from "next";
import { Outfit, Dancing_Script } from "next/font/google";

import "./globals.css";

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
  title: "Matter · Cancha de vóley en Córdoba",
  description:
    "Cancha de vóley techada en Av. Bulnes 1756, Córdoba. Turnos de 2 horas, todos los días de 08:00 a 00:00. Elegí tu horario y consultanos por WhatsApp.",
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
      <body className="font-display flex min-h-full flex-col">{children}</body>
    </html>
  );
}
