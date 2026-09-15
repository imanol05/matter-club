# Matter Club · turnero de la cancha

Web + turnero para reservar la cancha de vóley. Next.js 16 (App Router) +
Tailwind 4 + TypeScript.

```bash
npm run dev     # http://localhost:3000
npm run build   # build de producción
npx eslint .    # lint
```

## Pantallas

| Ruta      | Qué es                                                              |
| --------- | ------------------------------------------------------------------- |
| `/`       | Landing: presentación, características, tarifas, ubicación          |
| `/turnos` | Turnero público: grilla semanal, se pide el turno y queda pendiente |
| `/admin`  | Panel del encargado: confirmar/rechazar pedidos, bloquear horarios  |

## Estado actual: es una demo

**No hay backend.** Los datos viven en `localStorage` del navegador y arrancan
de una agenda de ejemplo (`lib/semilla.ts`) que se genera relativa a la semana
actual, así la demo se ve igual de realista se abra el día que se abra. El botón
"Reiniciar datos de ejemplo" del panel vuelve todo a cero.

La frontera está en `lib/store.tsx`: es lo único que consumen las pantallas.
Cuando entre Supabase se reimplementa ese hook y los componentes no se tocan.

## Dos decisiones que conviene no romper

**La jornada no es el día calendario.** La cancha abre 08:00 y cierra 02:00, así
que el turno de las 00:00 del sábado pertenece a la *jornada del viernes* —
para el encargado y para el que juega, eso es "la noche del viernes". Toda la
traducción entre jornada+bloque e instante real está en `lib/horarios.ts`, junto
con el offset de Argentina (UTC-3 fijo, sin horario de verano).

**El solapamiento de reservas se previene en la base, no en el código.** La demo
hace un chequeo optimista en `lib/almacen.ts`, que alcanza para un solo
navegador. En producción va un constraint de exclusión de Postgres sobre el
rango horario: es lo único que aguanta dos personas tocando el mismo horario en
el mismo instante.

## Qué falta

- [ ] **Confirmar la tarifa.** Los $5.600 por persona salen de un turno suelto,
      no los validó el club. Los dueños todavía tienen que definir el precio.
- [ ] Fotos reales de Matter (hay marcadores de posición en `/` y en el mapa)
- [ ] Verificar la hora de apertura (asumimos 08:00; el cierre a las 24:00 sí
      está confirmado)
- [ ] Supabase: reemplazar `lib/almacen.ts` por consultas reales
- [ ] Login del encargado (hoy `/admin` está abierto a cualquiera)
- [ ] Aviso por WhatsApp al confirmar
- [ ] Turnos fijos semanales gestionables desde el panel (hoy solo vienen del seed)
- [ ] Lista de espera
- [ ] PWA instalable
