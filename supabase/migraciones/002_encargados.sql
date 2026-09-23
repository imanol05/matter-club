-- Restringe el panel a una lista explícita de encargados.
--
-- Por qué, si ya vamos a apagar el registro público:
--
-- El esquema original le daba control total a cualquier usuario `authenticated`.
-- Eso deja toda la seguridad colgando de un checkbox del panel de Supabase —
-- que de hecho venía prendido por defecto, así que durante un rato cualquiera
-- podía registrarse y pasar a manejar la agenda de Matter.
--
-- Un checkbox se puede volver a prender sin querer, o venir prendido después
-- de una actualización. Con esto, estar logueado deja de alcanzar: hay que
-- estar en la tabla. Si mañana se cuela un registro, ese usuario no puede
-- tocar nada.

create table if not exists encargados (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre  text,
  creado  timestamptz not null default now()
);

alter table encargados enable row level security;

-- SECURITY DEFINER para que la función pueda mirar la tabla sin que el RLS de
-- `encargados` la muerda desde adentro de las políticas que la usan.
-- El search_path fijo evita que alguien cree un `encargados` falso en otro
-- esquema y lo haga resolver ahí.
create or replace function es_encargado()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from encargados where user_id = auth.uid());
$$;

revoke all on function es_encargado() from public;
grant execute on function es_encargado() to authenticated;

-- Un encargado puede ver quiénes son los demás; nadie más ve la tabla.
drop policy if exists encargados_lectura on encargados;
create policy encargados_lectura on encargados
  for select to authenticated using (es_encargado());


-- ---------------------------------------------------------------------------
-- Se reemplazan las políticas que alcanzaba con estar logueado
-- ---------------------------------------------------------------------------

drop policy if exists reservas_gestion_encargado on reservas;
create policy reservas_gestion_encargado on reservas
  for all to authenticated
  using (es_encargado()) with check (es_encargado());

drop policy if exists fijos_gestion_encargado on turnos_fijos;
create policy fijos_gestion_encargado on turnos_fijos
  for all to authenticated
  using (es_encargado()) with check (es_encargado());

drop policy if exists esperas_gestion_encargado on esperas;
create policy esperas_gestion_encargado on esperas
  for all to authenticated
  using (es_encargado()) with check (es_encargado());


-- ---------------------------------------------------------------------------
-- Alta del encargado
-- ---------------------------------------------------------------------------
-- Correr DESPUÉS de crear el usuario en Authentication → Users.
-- Cambiá el mail por el que hayas usado.

-- insert into encargados (user_id, nombre)
-- select id, 'Encargado de Matter' from auth.users where email = 'PONE_ACA_EL_MAIL'
-- on conflict (user_id) do nothing;

-- Para verificar que quedó:
-- select e.nombre, u.email from encargados e join auth.users u on u.id = e.user_id;
