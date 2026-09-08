-- Excursão Família Lubian — estrutura e dados iniciais
-- Execute uma vez no Supabase: SQL Editor > New query > Run.
-- Versão simples para uma única viagem: qualquer pessoa com o link pode usar.

create extension if not exists pgcrypto;

create table if not exists public.family_trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  currency text not null default 'BRL',
  origin jsonb not null,
  destination jsonb not null,
  transport jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_passengers (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  name text not null,
  full_name text not null default '',
  cpf text not null default '',
  phone text not null default '',
  emergency_contact text not null default '',
  age_group text not null default 'unknown' check (age_group in ('adult', 'child', 'unknown')),
  confirmed boolean not null default false,
  seat_no integer check (seat_no between 1 and 99),
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_tasks (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  title text not null,
  description text not null default '',
  completed boolean not null default false,
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_costs (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'planned' check (status in ('planned', 'paid')),
  due_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_family_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists family_trips_updated_at on public.family_trips;
create trigger family_trips_updated_at before update on public.family_trips for each row execute function public.set_family_updated_at();
drop trigger if exists family_passengers_updated_at on public.family_passengers;
create trigger family_passengers_updated_at before update on public.family_passengers for each row execute function public.set_family_updated_at();
drop trigger if exists family_tasks_updated_at on public.family_tasks;
create trigger family_tasks_updated_at before update on public.family_tasks for each row execute function public.set_family_updated_at();
drop trigger if exists family_costs_updated_at on public.family_costs;
create trigger family_costs_updated_at before update on public.family_costs for each row execute function public.set_family_updated_at();

-- Sem login: a chave pública do projeto pode ler e alterar apenas estas quatro tabelas.
alter table public.family_trips enable row level security;
alter table public.family_passengers enable row level security;
alter table public.family_tasks enable row level security;
alter table public.family_costs enable row level security;

grant select, insert, update, delete on table public.family_trips, public.family_passengers, public.family_tasks, public.family_costs to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

drop policy if exists "family trips authenticated" on public.family_trips;
create policy "family trips authenticated" on public.family_trips for all to anon, authenticated using (true) with check (true);
drop policy if exists "family passengers authenticated" on public.family_passengers;
create policy "family passengers authenticated" on public.family_passengers for all to anon, authenticated using (true) with check (true);
drop policy if exists "family tasks authenticated" on public.family_tasks;
create policy "family tasks authenticated" on public.family_tasks for all to anon, authenticated using (true) with check (true);
drop policy if exists "family costs authenticated" on public.family_costs;
create policy "family costs authenticated" on public.family_costs for all to anon, authenticated using (true) with check (true);

insert into public.family_trips (id, slug, title, description, start_date, end_date, currency, origin, destination, transport)
values (
  'f011b1a0-2026-4f10-8a30-103020260102',
  'familia-lubian',
  'Excursão Família Lubian',
  'Festa de 80 anos — encontro da Família Lubian em Tacuru/MS.',
  '2026-10-30', '2026-11-02', 'BRL',
  '{"name":"Embarque — Blumenau","address":"Rua Augusta, 45, Garcia, Blumenau - SC, 89022-475, Brasil","latitude":-26.9555786,"longitude":-49.069499,"timezone":"America/Sao_Paulo"}'::jsonb,
  '{"name":"Festa de 80 anos — Tacuru","address":"Rua Izidora Vilhalva, 380, Tacuru - MS, 79975-000, Brasil","latitude":-23.6337505,"longitude":-55.0129758,"timezone":"America/Campo_Grande"}'::jsonb,
  '{"company":"Catarinense — cotação principal","vehicle":"Ônibus rodoviário com ar-condicionado, sanitário e conservadora de água e gelo","capacity":46,"departure_time":null,"return_time":null,"payment_deadline":"2026-10-27","payment_methods":"Boleto bancário ou Pix","notes":"Nota fiscal para pessoa física. Alimentação e hospedagem dos motoristas e estacionamento ficam por conta do contratante. Confirmar se o valor cobre os 36 nomes, pois a cotação informa 23 adultos e 9 crianças."}'::jsonb
)
on conflict (slug) do nothing;

insert into public.family_passengers (trip_id, name, sort_order)
select 'f011b1a0-2026-4f10-8a30-103020260102', passenger.name, passenger.position
from (values
  (1,'Rafaela'),(2,'Mirian'),(3,'Fabiano'),(4,'João'),(5,'Matias'),(6,'Marinete'),
  (7,'Luiz'),(8,'Nando'),(9,'Rosiane'),(10,'Sidemar'),(11,'Heitor'),(12,'Dayane'),
  (13,'Bruna'),(14,'Jorge'),(15,'César'),(16,'Helena'),(17,'Tati'),(18,'Dani'),
  (19,'Willian'),(20,'José'),(21,'Francisco'),(22,'Ricardo'),(23,'Sophia'),(24,'Bruno'),
  (25,'Douglas'),(26,'Tia Cida'),(27,'Marielle'),(28,'Lucas'),(29,'Mateus'),(30,'Bely'),
  (31,'Pedro'),(32,'Marina'),(33,'Gili'),(34,'Karine'),(35,'Henrique'),(36,'Helena')
) as passenger(position, name)
where not exists (
  select 1 from public.family_passengers where trip_id = 'f011b1a0-2026-4f10-8a30-103020260102'
);

insert into public.family_tasks (trip_id, title, description, priority, due_date, sort_order)
select 'f011b1a0-2026-4f10-8a30-103020260102', task.title, task.description, task.priority, task.due_date::date, task.position
from (values
  (1,'Definir horários e data de retorno','Escolher retorno em 01/11 ou 02/11 com a transportadora.','high','2026-09-15'),
  (2,'Confirmar valor para 36 passageiros','A cotação de R$ 18.000 informa 32 pessoas, mas a lista atual tem 36.','high','2026-09-15'),
  (3,'Identificar as duas Helenas','Adicionar sobrenome ou apelido para não confundir os documentos.','normal','2026-09-20'),
  (4,'Coletar dados dos passageiros','Preencher nome completo, CPF, telefone e contato de emergência.','high','2026-10-10'),
  (5,'Quitar o ônibus','Pagamento total por boleto ou Pix até três dias antes da viagem.','high','2026-10-27'),
  (6,'Distribuir os assentos','Organizar os 46 lugares do ônibus.','normal','2026-10-25'),
  (7,'Confirmar hospedagem e refeições','Planejar estadia, alimentação e roteiro em Tacuru/MS.','normal','2026-10-10'),
  (8,'Classificar adultos e crianças','Confirmar os 23 adultos e as 9 crianças e registrar as idades.','normal','2026-10-10'),
  (9,'Orçar despesas dos motoristas','Alimentação, hospedagem e estacionamento ficam por conta da família.','normal','2026-10-10'),
  (10,'Enviar lista final à transportadora','Enviar nomes completos e CPFs de todos os passageiros.','high','2026-10-20')
) as task(position, title, description, priority, due_date)
where not exists (
  select 1 from public.family_tasks where trip_id = 'f011b1a0-2026-4f10-8a30-103020260102'
);

insert into public.family_costs (trip_id, name, amount, status, due_date, notes)
select 'f011b1a0-2026-4f10-8a30-103020260102', 'Ônibus rodoviário — Catarinense', 18000, 'planned', '2026-10-27', 'Cotação principal; pagamento total até três dias antes da viagem.'
where not exists (
  select 1 from public.family_costs where trip_id = 'f011b1a0-2026-4f10-8a30-103020260102'
);

-- Habilita atualização automática entre celulares.
do $$
declare table_name text;
begin
  foreach table_name in array array['family_trips','family_passengers','family_tasks','family_costs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
