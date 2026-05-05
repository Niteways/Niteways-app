-- Align ticket_purchases.status with venue portal app (manual orders, stats).
ALTER TABLE public.ticket_purchases DROP CONSTRAINT IF EXISTS ticket_purchases_status_check;

ALTER TABLE public.ticket_purchases
  ADD CONSTRAINT ticket_purchases_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'active',
        'used',
        'cancelled',
        'refunded',
        'pending',
        'confirmed'
      ]::text[]
    )
  );
