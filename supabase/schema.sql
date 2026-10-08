create table public.ah_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_.-]{3,40}$'),
 email text not null,
 created_at timestamptz not null default now()
);
create table public.ah_guests (
 token_hash text primary key,
 owner_id uuid unique not null default gen_random_uuid(),
 expires_at timestamptz not null default now() + interval '30 days'
);
create table public.ah_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.ah_admins enable row level security;
revoke all on public.ah_admins from anon,authenticated;
create table public.ah_orders (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 request_key uuid not null,
 payload jsonb not null,
 status text not null default 'recibido' check (status in ('recibido','confirmado','preparando','en_camino','entregado','cancelado')),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 unique(owner_id,request_key)
);
create index ah_orders_owner_created on public.ah_orders(owner_id,created_at desc);
create table public.ah_threads (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 name text not null,
 status text not null default 'abierto' check(status in ('abierto','cerrado')),
 created_at timestamptz not null default now()
);
create index ah_threads_owner_created on public.ah_threads(owner_id,created_at desc);
create table public.ah_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.ah_threads(id) on delete cascade,
 sender text not null check(sender in ('cliente','administrador')),
 body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index ah_messages_thread_created on public.ah_messages(thread_id,created_at);
create table public.ah_rate_limits (
 key text primary key,
 hits integer not null default 1,
 window_at timestamptz not null default now()
);
alter table public.ah_profiles enable row level security;
alter table public.ah_guests enable row level security;
alter table public.ah_orders enable row level security;
alter table public.ah_threads enable row level security;
alter table public.ah_messages enable row level security;
alter table public.ah_rate_limits enable row level security;
revoke all on public.ah_profiles,public.ah_guests,public.ah_orders,public.ah_threads,public.ah_messages,public.ah_rate_limits from anon,authenticated;
-- These tables are only accessed by the Edge Function, which checks every actor.
create function public.ah_rate_limit(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path = public as $$
declare v_hits integer;
begin
 insert into public.ah_rate_limits(key,hits,window_at) values(p_key,1,now())
 on conflict(key) do update set
 hits=case when ah_rate_limits.window_at < now()-make_interval(secs=>p_seconds) then 1 else ah_rate_limits.hits+1 end,
 window_at=case when ah_rate_limits.window_at < now()-make_interval(secs=>p_seconds) then now() else ah_rate_limits.window_at end
 returning hits into v_hits;
 return v_hits<=p_max;
end; $$;
revoke all on function public.ah_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ah_rate_limit(text,integer,integer) to service_role;
create schema if not exists ah_private;
revoke all on schema ah_private from public,anon,authenticated;
create function ah_private.ah_new_account() returns trigger language plpgsql security definer set search_path=public as $$
declare v_username text;
begin
 v_username=lower(trim(new.raw_user_meta_data->>'username'));
 if v_username is null or v_username !~ '^[a-z0-9_.-]{3,40}$' then raise exception 'Nombre de usuario inválido'; end if;
 if v_username='admin' and lower(new.email)<>'gamerpixelpulse@gmail.com' then raise exception 'Nombre reservado'; end if;
 insert into public.ah_profiles(user_id,username,email) values(new.id,v_username,lower(new.email));
 return new;
end; $$;
revoke all on function ah_private.ah_new_account() from public,anon,authenticated;
create trigger ah_auth_account after insert on auth.users for each row execute function ah_private.ah_new_account();
grant all on public.ah_profiles,public.ah_admins,public.ah_guests,public.ah_orders,public.ah_threads,public.ah_messages,public.ah_rate_limits to service_role;
