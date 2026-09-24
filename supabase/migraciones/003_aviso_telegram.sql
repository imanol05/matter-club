-- Aviso por Telegram al dueño cuando entra una reserva.
--
-- Va como disparador de la base y no como código del navegador porque así se
-- dispara siempre que aparezca una reserva, sin depender de que el cliente que
-- la creó se acuerde de avisar (ni de que no cierre la pestaña antes).
--
-- El token del bot se guarda en Vault, cifrado. No puede vivir en el código del
-- sitio: cualquiera puede leer el JavaScript que se descarga, y con ese token
-- se pueden mandar mensajes haciéndose pasar por el bot.
--
-- ANTES de correr esto hay que cargar los dos secretos (ver el final).

create extension if not exists pg_net;


create or replace function avisar_reserva_nueva()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  token   text;
  chat    text;
  cuando  text;
  texto   text;
begin
  select decrypted_secret into token
    from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into chat
    from vault.decrypted_secrets where name = 'telegram_chat_id';

  -- Sin secretos cargados no avisa, pero la reserva se guarda igual. Nunca
  -- hacer fallar el insert por esto: perder el aviso es molesto, perder la
  -- reserva del cliente es grave.
  if token is null or chat is null then
    return new;
  end if;

  -- Los timestamptz se guardan en UTC; para el mensaje hay que traerlos a la
  -- hora de acá o el dueño leería una hora que no es.
  cuando := to_char(
    new.inicio at time zone 'America/Argentina/Buenos_Aires',
    'DD/MM HH24:MI'
  ) || ' a ' || to_char(
    new.fin at time zone 'America/Argentina/Buenos_Aires',
    'HH24:MI'
  );

  texto := '🏐 <b>Nueva reserva</b>' || E'\n\n'
        || '<b>' || new.nombre || '</b>' || E'\n'
        || cuando || E'\n'
        || new.telefono
        || coalesce(E'\n\n<i>' || new.nota || '</i>', '')
        || E'\n\n' || 'Confirmala en el panel.';

  -- Asíncrono: la reserva se confirma al cliente sin esperar a Telegram.
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', chat,
      'text', texto,
      'parse_mode', 'HTML'
    )
  );

  return new;
end;
$$;

revoke all on function avisar_reserva_nueva() from public;

drop trigger if exists reservas_avisar on reservas;
create trigger reservas_avisar
  after insert on reservas
  for each row
  -- Sólo los pedidos de clientes. Los bloqueos que carga el encargado no hace
  -- falta avisárselos: los acaba de hacer él.
  when (new.estado = 'pendiente')
  execute function avisar_reserva_nueva();


-- ---------------------------------------------------------------------------
-- Carga de los secretos
-- ---------------------------------------------------------------------------
-- Correr ANTES del resto, cambiando los valores. Se guardan cifrados.
--
-- select vault.create_secret('123456789:AAxxxxxxxxxxxxxxxxx', 'telegram_bot_token');
-- select vault.create_secret('123456789', 'telegram_chat_id');
--
-- Para cambiarlos después:
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'telegram_bot_token'),
--   'EL_TOKEN_NUEVO'
-- );
--
-- Para verificar que quedaron (muestra sólo los nombres, no los valores):
-- select name from vault.secrets;
