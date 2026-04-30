alter table public.merchant_orders
  add column if not exists external_payment_method text,
  add column if not exists external_payment_status text not null default 'pending',
  add column if not exists external_payment_sent_at timestamptz,
  add column if not exists external_payment_confirmed_at timestamptz;

update public.merchant_orders
set external_payment_method = coalesce(external_payment_method, 'mobilepay')
where external_payment_method is null;

update public.merchant_orders
set external_payment_status = case
  when payment_status = 'paid' then 'confirmed'
  when payment_status in ('cancelled', 'refunded') then 'cancelled'
  else coalesce(external_payment_status, 'pending')
end;

alter table public.merchant_orders
  alter column external_payment_method set default 'mobilepay';

create index if not exists merchant_orders_external_payment_status_idx
  on public.merchant_orders (external_payment_status);

comment on column public.merchant_orders.external_payment_method is 'Metoda externă de decontare fiat pentru această comandă. Pentru Danemarca, implicit MobilePay.';
comment on column public.merchant_orders.external_payment_status is 'Statusul plății externe fiat: pending, sent, confirmed, disputed, cancelled.';
comment on column public.merchant_orders.external_payment_sent_at is 'Momentul în care cumpărătorul a marcat că a trimis plata externă.';
comment on column public.merchant_orders.external_payment_confirmed_at is 'Momentul în care comerciantul a confirmat plata externă.';
