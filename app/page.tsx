import Link from "next/link";

import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Emblema } from "@/components/Marca";
import { Icono } from "@/components/Iconos";
import { CARACTERISTICAS, CONTACTO, MEDIOS_DE_PAGO, TARIFAS } from "@/lib/club";

export default function Inicio() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Hero />
        <Cancha />
        <Tarifas />
        <Ubicacion />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="fondo-halos border-b border-borde/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
          <div className="max-w-xl text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bordo-2">
              Cancha de vóley · {CONTACTO.ciudad}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-hueso sm:text-5xl lg:text-6xl">
              Reservá tu cancha
              <br />
              <span className="text-tenue">sin llamar a nadie</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-tenue">
              Mirá los horarios libres de la semana y pedí tu turno de 2 horas en
              treinta segundos. Abierto todos los días de {CONTACTO.horario}.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/turnos"
                className="rounded-xl bg-bordo px-7 py-4 text-center font-semibold text-hueso transition-colors hover:bg-bordo-2"
              >
                Ver turnos disponibles
              </Link>
              <a
                href={CONTACTO.whatsappUrl}
                className="rounded-xl border border-borde px-7 py-4 text-center font-semibold text-tenue transition-colors hover:border-marino-2 hover:text-hueso"
              >
                Escribir por WhatsApp
              </a>
            </div>
          </div>

          <div className="shrink-0">
            <Emblema className="w-56 sm:w-72" />
          </div>
        </div>

      </div>
    </section>
  );
}

function Cancha() {
  return (
    <section id="cancha" className="scroll-mt-20 border-b border-borde/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bordo-2">
          La cancha
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-hueso sm:text-4xl">
          Una cancha pensada para jugar en serio
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-tenue">
          Techada y con piso flotante, lista para cualquier horario y cualquier
          clima. Venís con tu grupo y jugás.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARACTERISTICAS.map((c) => (
            <div
              key={c.titulo}
              className={`rounded-xl border p-6 transition-colors ${
                c.proximamente
                  ? "border-dashed border-borde bg-carbon/40"
                  : "border-borde bg-carbon hover:border-marino-2/60"
              }`}
            >
              <Icono
                nombre={c.icono}
                className={`size-7 ${c.proximamente ? "text-tenue" : "text-bordo-2"}`}
              />
              <h3 className="mt-4 flex flex-wrap items-center gap-2 font-semibold text-hueso">
                {c.titulo}
                {c.proximamente && (
                  <span className="rounded-full border border-borde px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-tenue">
                    Pronto
                  </span>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-tenue">{c.texto}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

function Tarifas() {
  return (
    <section
      id="tarifas"
      className="scroll-mt-20 border-b border-borde/60 bg-carbon/30"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bordo-2">
          Tarifas
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-hueso sm:text-4xl">
          Cuánto sale jugar
        </h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {TARIFAS.map((t) => (
            <div
              key={t.titulo}
              className={`relative flex flex-col rounded-xl border p-6 ${
                t.destacado ? "border-bordo/60 bg-bordo/10" : "border-borde bg-carbon"
              }`}
            >
              {t.etiqueta && (
                <span className="absolute -top-3 left-6 rounded-full bg-bordo px-3 py-1 text-xs font-semibold text-hueso">
                  {t.etiqueta}
                </span>
              )}
              <h3 className="font-semibold text-hueso">{t.titulo}</h3>
              <p className="mt-3 text-3xl font-semibold text-hueso">{t.precio}</p>
              <p className="text-sm text-tenue">{t.unidad}</p>
              <p className="mt-4 text-sm leading-relaxed text-tenue">{t.detalle}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-tenue">
          {MEDIOS_DE_PAGO} No cobramos seña ni pedimos tarjeta para reservar.
        </p>
      </div>
    </section>
  );
}

function Ubicacion() {
  return (
    <section id="ubicacion" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bordo-2">
              Ubicación
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-hueso sm:text-4xl">
              Dónde estamos
            </h2>
            <p className="mt-4 text-lg text-hueso">{CONTACTO.direccion}</p>
            <p className="mt-1 text-tenue">Todos los días de {CONTACTO.horario}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={CONTACTO.mapaUrl}
                className="rounded-xl border border-borde px-6 py-3.5 text-center font-semibold text-tenue transition-colors hover:border-marino-2 hover:text-hueso"
              >
                Cómo llegar
              </a>
              <a
                href={CONTACTO.whatsappUrl}
                className="rounded-xl bg-bordo px-6 py-3.5 text-center font-semibold text-hueso transition-colors hover:bg-bordo-2"
              >
                WhatsApp {CONTACTO.telefono}
              </a>
            </div>
          </div>

          {/* Embed de Google Maps por dirección: no necesita clave de API. */}
          <iframe
            title={`Mapa de ${CONTACTO.nombre}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(CONTACTO.direccion)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-video w-full rounded-xl border border-borde"
          />
        </div>
      </div>
    </section>
  );
}
