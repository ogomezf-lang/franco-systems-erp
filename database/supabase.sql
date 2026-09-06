-- =========================================================
-- FRANCO SYSTEMS ERP v2 CLOUD
-- SUPABASE / POSTGRESQL
-- Ejecutar completo en: Supabase > SQL Editor > New query
-- =========================================================

create extension if not exists pgcrypto;

-- -------------------------
-- EMPRESAS
-- -------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi Empresa',
  ruc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------
-- PERFILES / USUARIOS
-- -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null default 'Usuario',
  role text not null default 'ADMIN' check (role in ('ADMIN','OPERADOR')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_company on public.profiles(company_id);

-- -------------------------
-- CLIENTES
-- -------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document text not null,
  client_type text not null default 'PERSONA' check (client_type in ('PERSONA','EMPRESA')),
  name text not null,
  address text default '',
  phone text default '',
  email text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document)
);

create index if not exists idx_clients_company on public.clients(company_id);
create index if not exists idx_clients_name on public.clients(company_id, name);

-- -------------------------
-- PRODUCTOS
-- -------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text default '',
  unit text not null default 'UND',
  description text not null,
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_products_description on public.products(company_id, description);

-- -------------------------
-- CONFIGURACIÓN
-- -------------------------
create table if not exists public.settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  phone text default '',
  address text default '',
  location text default '',
  email text default '',
  responsible text default '',
  responsible_role text default '',
  final_message text default 'Gracias por elegirnos. Su confianza nos inspira a seguir mejorando.',
  logo_data_url text default '',
  bank_bcp text default '',
  bank_bbva text default '',
  bank_interbank text default '',
  bank_scotiabank text default '',
  yape text default '',
  plin text default '',
  updated_at timestamptz not null default now()
);

-- -------------------------
-- CORRELATIVOS
-- -------------------------
create table if not exists public.quote_sequences (
  company_id uuid primary key references public.companies(id) on delete cascade,
  next_number integer not null default 1 check (next_number >= 1)
);

-- -------------------------
-- COTIZACIONES
-- -------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_sequence integer not null,
  quote_number text not null,
  quote_date date not null default current_date,
  client_id uuid references public.clients(id) on delete set null,
  client_document text default '',
  client_name text not null,
  client_address text default '',
  document_type text not null default 'FACTURA'
    check (document_type in ('FACTURA','BOLETA','RHE','SIN_IGV')),
  conditions text default '',
  base_amount numeric(14,2) not null default 0,
  igv_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  retention_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'ACTIVA' check (status in ('ACTIVA','ANULADA')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, quote_number)
);

create index if not exists idx_quotes_company_date on public.quotes(company_id, quote_date desc);
create index if not exists idx_quotes_status on public.quotes(company_id, status);
create index if not exists idx_quotes_client on public.quotes(company_id, client_name);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  position integer not null default 1,
  unit text not null default 'UND',
  code text default '',
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_items_quote on public.quote_items(quote_id, position);

-- -------------------------
-- UPDATED_AT AUTOMÁTICO
-- -------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_companies_updated on public.companies;
create trigger trg_companies_updated
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_quotes_updated on public.quotes;
create trigger trg_quotes_updated
before update on public.quotes
for each row execute function public.set_updated_at();

-- -------------------------
-- CORRELATIVO SEGURO
-- -------------------------
create or replace function public.next_quote_number(p_company_id uuid)
returns table(sequence_number integer, quote_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.quote_sequences(company_id, next_number)
  values (p_company_id, 2)
  on conflict (company_id)
  do update set next_number = public.quote_sequences.next_number + 1
  returning next_number - 1 into v_number;

  return query
  select v_number, 'COT01-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke all on function public.next_quote_number(uuid) from public;
grant execute on function public.next_quote_number(uuid) to service_role;

-- -------------------------
-- NUEVO USUARIO = NUEVA EMPRESA
-- El primer usuario queda ADMIN.
-- Los usuarios adicionales que cree el ERP serán reasignados
-- automáticamente a la empresa del administrador.
-- -------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_name text;
begin
  v_name := coalesce(
    nullif(new.raw_user_meta_data->>'company_name',''),
    'Mi Empresa'
  );

  insert into public.companies(name)
  values (v_name)
  returning id into v_company;

  insert into public.profiles(id, company_id, full_name, role)
  values (
    new.id,
    v_company,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1), 'Usuario'),
    'ADMIN'
  );

  insert into public.settings(company_id)
  values (v_company)
  on conflict do nothing;

  insert into public.quote_sequences(company_id, next_number)
  values (v_company, 1)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -------------------------
-- RLS: ACTIVADO
-- El frontend NO usa service_role.
-- El backend valida sesión antes de operar.
-- Estas políticas dejan además una capa de protección
-- si en el futuro se usa el cliente Supabase directamente.
-- -------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.quote_sequences enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid() limit 1
$$;

-- Limpiar políticas si se vuelve a ejecutar el script
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('companies','profiles','clients','products','settings','quote_sequences','quotes','quote_items')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy "company_select" on public.companies
for select using (id = public.current_company_id());

create policy "company_update" on public.companies
for update using (id = public.current_company_id());

create policy "profiles_company_select" on public.profiles
for select using (company_id = public.current_company_id());

create policy "clients_company_all" on public.clients
for all using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "products_company_all" on public.products
for all using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "settings_company_all" on public.settings
for all using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "quotes_company_all" on public.quotes
for all using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "quote_items_company_all" on public.quote_items
for all using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.company_id = public.current_company_id()
  )
);

-- No se concede acceso directo al correlativo desde el cliente.
-- El backend usa service_role para solicitar el siguiente número.

-- =========================================================
-- FIN
-- =========================================================
