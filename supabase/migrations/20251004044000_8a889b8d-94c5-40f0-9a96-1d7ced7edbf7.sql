-- Fix RLS recursion issue in orders/order_items tables

-- Drop problematic policy
DROP POLICY IF EXISTS "Vendors can view orders containing their products" ON orders;

-- Create security definer function to check vendor access without RLS recursion
CREATE OR REPLACE FUNCTION public.is_vendor_for_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN vendors v ON v.id = oi.vendor_id
    WHERE oi.order_id = _order_id
      AND v.user_id = _user_id
  )
$$;

-- Recreate policy using security definer function
CREATE POLICY "Vendors can view orders containing their products"
ON orders
FOR SELECT
TO authenticated
USING (is_vendor_for_order(auth.uid(), id));