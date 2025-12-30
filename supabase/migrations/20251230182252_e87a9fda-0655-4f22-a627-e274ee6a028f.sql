-- Add DELETE policy for orders (admin only, only pending/processing orders)
CREATE POLICY "Admins can delete pending or processing orders" 
ON public.orders 
FOR DELETE 
USING (
  has_admin_access(auth.uid()) 
  AND status IN ('pending', 'processing')
);

-- Also need to handle order_items deletion (cascade)
CREATE POLICY "Admins can delete order items for pending or processing orders" 
ON public.order_items 
FOR DELETE 
USING (
  has_admin_access(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.status IN ('pending', 'processing')
  )
);