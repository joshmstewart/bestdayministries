-- Fix vendor access to order_items with security definer function

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Vendors can view their order items" ON order_items;

-- Create security definer function to check vendor ownership
CREATE OR REPLACE FUNCTION public.is_vendor_for_order_item(_user_id uuid, _vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM vendors
    WHERE id = _vendor_id
      AND user_id = _user_id
  )
$$;

-- Recreate policy using security definer function
CREATE POLICY "Vendors can view their order items"
ON order_items
FOR SELECT
TO authenticated
USING (is_vendor_for_order_item(auth.uid(), vendor_id));