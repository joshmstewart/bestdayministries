-- Update the vendor check functions to include team members

-- Update is_vendor_for_order_item to include team members
CREATE OR REPLACE FUNCTION public.is_vendor_for_order_item(_user_id uuid, _vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM vendors
    WHERE id = _vendor_id
      AND (
        user_id = _user_id
        OR EXISTS (
          SELECT 1 FROM vendor_team_members vtm
          WHERE vtm.vendor_id = _vendor_id
            AND vtm.user_id = _user_id
            AND vtm.accepted_at IS NOT NULL
        )
      )
  )
$$;

-- Update is_vendor_for_order to include team members
CREATE OR REPLACE FUNCTION public.is_vendor_for_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN vendors v ON v.id = oi.vendor_id
    WHERE oi.order_id = _order_id
      AND (
        v.user_id = _user_id
        OR EXISTS (
          SELECT 1 FROM vendor_team_members vtm
          WHERE vtm.vendor_id = v.id
            AND vtm.user_id = _user_id
            AND vtm.accepted_at IS NOT NULL
        )
      )
  )
$$;

-- Update the vendor update policy for order_items to include team members
DROP POLICY IF EXISTS "Vendors can update their order items" ON public.order_items;

CREATE POLICY "Vendors and team members can update their order items" ON public.order_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = order_items.vendor_id
    AND (
      v.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM vendor_team_members vtm
        WHERE vtm.vendor_id = v.id
        AND vtm.user_id = auth.uid()
        AND vtm.accepted_at IS NOT NULL
      )
    )
  )
);