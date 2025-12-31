-- Allow admins to delete test/erroneous orders even after completion/cancellation
-- (still blocks shipped/delivered orders)

ALTER POLICY "Admins can delete pending or processing orders"
ON public.orders
USING (
  has_admin_access(auth.uid())
  AND status = ANY (ARRAY[
    'pending'::order_status,
    'processing'::order_status,
    'completed'::order_status,
    'cancelled'::order_status
  ])
);

ALTER POLICY "Admins can delete order items for pending or processing orders"
ON public.order_items
USING (
  has_admin_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.status = ANY (ARRAY[
        'pending'::order_status,
        'processing'::order_status,
        'completed'::order_status,
        'cancelled'::order_status
      ])
  )
);
