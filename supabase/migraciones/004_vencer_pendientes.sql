-- Libera los horarios de los pedidos que nadie respondió.
--
-- El problema que resuelve: un pedido en estado 'pendiente' bloquea el horario
-- para todos los demás (está en el WHERE del constraint de exclusión, y tiene
-- que estarlo, si no dos grupos pedirían lo mismo). Pero nada lo destrababa.
-- Si el dueño no contestaba —se olvidó, estaba de viaje, no vio el aviso— ese
-- horario quedaba muerto para siempre, sin que nadie entendiera por qué.
--
-- También cierra la puerta a que alguien bloquee la agenda entera: cualquiera
-- puede insertar pedidos a futuro, así que sin vencimiento un script podría
-- llenar las 12 semanas y dejar al club sin poder vender un turno hasta que el
-- dueño los rechazara uno por uno.

-- 'vencida' es un estado aparte y no 'rechazada' a propósito: no es lo mismo
-- "lo miré y dije que no" que "se me pasó". El dueño necesita poder ver la
-- diferencia, porque la segunda significa que está perdiendo clientes.
alter table reservas drop constraint if exists reservas_estado_valido;
alter table reservas add constraint reservas_estado_valido
  check (estado in ('pendiente', 'confirmada', 'rechazada', 'bloqueo', 'vencida'));

-- No hace falta tocar el constraint de exclusión: su WHERE es una lista de los
-- estados que ocupan, y 'vencida' no está, así que el horario queda libre solo.


create or replace function vencer_pendientes()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tocadas integer;
begin
  update reservas
     set estado = 'vencida'
   where estado = 'pendiente'
     and (
       -- Nadie la respondió en dos días.
       --
       -- Dos días es un número elegido, no una verdad: suficiente para que el
       -- dueño conteste con tranquilidad, y poco para que un horario no quede
       -- trabado una semana. Si el club resulta más lento contestando, subilo.
       creada < now() - interval '48 hours'
       -- O el turno ya empezó, con lo cual retenerlo no le sirve a nadie.
       or inicio < now()
     );

  get diagnostics tocadas = row_count;
  return tocadas;
end;
$$;

revoke all on function vencer_pendientes() from public;


-- ---------------------------------------------------------------------------
-- El trabajo programado
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

-- Desprogramar antes de programar, para que correr esta migración dos veces no
-- deje dos trabajos haciendo lo mismo. Falla si no existía, y eso está bien.
do $$
begin
  perform cron.unschedule('vencer-pendientes');
exception
  when others then null;
end;
$$;

-- Cada 15 minutos. El trabajo es un update sobre un índice, no cuesta nada, y
-- así un horario que se libera vuelve a estar disponible casi en el momento.
select cron.schedule(
  'vencer-pendientes',
  '*/15 * * * *',
  $$select vencer_pendientes()$$
);


-- ---------------------------------------------------------------------------
-- Para verificar
-- ---------------------------------------------------------------------------
-- Que el trabajo quedó programado:
--   select jobname, schedule, active from cron.job where jobname = 'vencer-pendientes';
--
-- Correrlo a mano ahora (devuelve cuántas venció):
--   select vencer_pendientes();
--
-- Ver las últimas corridas:
--   select start_time, status, return_message from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'vencer-pendientes')
--   order by start_time desc limit 5;
--
-- Qué hay vencido:
--   select nombre, inicio, creada from reservas where estado = 'vencida'
--   order by creada desc;
