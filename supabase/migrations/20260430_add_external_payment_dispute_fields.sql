alter table public.merchant_orders
  add column if not exists external_payment_dispute_reason text,
  add column if not exists external_payment_disputed_at timestamptz,
  add column if not exists external_payment_disputed_by uuid references auth.users(id) on delete set null;

comment on column public.merchant_orders.external_payment_dispute_reason is 'Motivul disputei pentru plata externă MobilePay.';
comment on column public.merchant_orders.external_payment_disputed_at is 'Momentul în care plata externă a fost marcată în dispută.';
comment on column public.merchant_orders.external_payment_disputed_by is 'Utilizatorul care a deschis disputa pentru plata externă.';
