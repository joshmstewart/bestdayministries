-- Update RLS policies for products to include vendor team members

-- Drop existing vendor-specific policies
DROP POLICY IF EXISTS "Vendors can view their own products" ON public.products;
DROP POLICY IF EXISTS "Vendors can update their own products" ON public.products;
DROP POLICY IF EXISTS "Vendors can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Approved vendors can create products" ON public.products;

-- Create new policies that include team members

-- SELECT: Vendors and their team members can view products
CREATE POLICY "Vendors and team members can view their products" ON public.products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = products.vendor_id
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

-- UPDATE: Vendors and their team members can update products
CREATE POLICY "Vendors and team members can update their products" ON public.products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = products.vendor_id
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

-- DELETE: Vendors and their team members can delete products
CREATE POLICY "Vendors and team members can delete their products" ON public.products
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = products.vendor_id
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

-- INSERT: Approved vendors and their team members can create products
CREATE POLICY "Approved vendors and team members can create products" ON public.products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = products.vendor_id
    AND v.status = 'approved'
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