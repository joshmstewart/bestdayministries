#!/usr/bin/env bash
#
# E2E auth'd test for the cancel-and-refund-order edge function.
#
# Why this exists:
#   `supabase--curl_edge_functions` returns 401 from the sandbox because no
#   admin session is attached. This script signs in as the persistent
#   `testadmin@example.com` account, gets a real Bearer JWT, seeds a
#   throwaway TEST-mode order with NO Stripe payment id (so the function
#   exercises the full auth + cancel path WITHOUT touching Stripe / real
#   money), invokes the function, asserts DB side-effects, and cleans up.
#
# Safety:
#   - Operates only on a row this script just inserted, whose id it owns.
#   - Order has no stripe_payment_intent_id → no refund call to Stripe.
#   - Hard-deletes the synthetic order + items at the end (success or fail).
#
# Required env (already present in the Lovable sandbox):
#   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, PGHOST/PG* (psql)
#
# Usage:
#   bash scripts/test-cancel-refund-e2e.sh

set -euo pipefail

: "${VITE_SUPABASE_URL:?missing}"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?missing}"

URL="$VITE_SUPABASE_URL"
ANON="$VITE_SUPABASE_PUBLISHABLE_KEY"
ADMIN_EMAIL="testadmin@example.com"
ADMIN_PASSWORD="testpassword123"

echo "▶ Ensuring persistent test accounts exist…"
curl -s -X POST "$URL/functions/v1/create-persistent-test-accounts" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -d '{}' >/dev/null || true

echo "▶ Signing in as $ADMIN_EMAIL…"
LOGIN_JSON=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')
USER_ID=$(printf '%s' "$LOGIN_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("user",{}).get("id",""))')
if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo "✗ Sign-in failed: $LOGIN_JSON"; exit 1
fi
echo "  ✓ admin user id: $USER_ID"

echo "▶ Seeding throwaway TEST-mode order (no Stripe PI)…"
ORDER_ID=$(psql -At -c "
  INSERT INTO public.orders (user_id, total_amount, status, stripe_mode,
                             stripe_payment_intent_id, notes, shipping_address)
  VALUES ('$USER_ID', 0.50, 'pending', 'test', NULL,
          '__e2e_cancel_refund_test__',
          '{\"name\":\"E2E Test\",\"line1\":\"1 Test St\",\"city\":\"Denver\",\"state\":\"CO\",\"postal_code\":\"80202\",\"country\":\"US\"}'::jsonb)
  RETURNING id;
")
if [ -z "$ORDER_ID" ]; then echo "✗ Failed to insert order"; exit 1; fi
echo "  ✓ order id: $ORDER_ID"

# Best-effort: attach one item to also exercise the items update path.
PROD_ID=$(psql -At -c "SELECT id FROM public.products LIMIT 1;" || true)
if [ -n "$PROD_ID" ]; then
  psql -q -c "
    INSERT INTO public.order_items (order_id, product_id, quantity,
                                    price_at_purchase, fulfillment_status)
    VALUES ('$ORDER_ID', '$PROD_ID', 1, 0.50, 'pending');
  " >/dev/null
  echo "  ✓ attached 1 order_item (product $PROD_ID)"
else
  echo "  ⚠ no products in DB → skipping order_items seed"
fi

cleanup() {
  echo "▶ Cleaning up synthetic order $ORDER_ID…"
  psql -q -c "DELETE FROM public.order_items WHERE order_id = '$ORDER_ID';" >/dev/null || true
  psql -q -c "DELETE FROM public.orders      WHERE id       = '$ORDER_ID';" >/dev/null || true
  echo "  ✓ cleaned"
}
trap cleanup EXIT

echo "▶ Invoking cancel-and-refund-order with admin JWT…"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$URL/functions/v1/cancel-and-refund-order" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\",\"reason\":\"E2E auth flow test\"}")
HTTP=$(printf '%s' "$RESP" | tail -n1)
BODY=$(printf '%s' "$RESP" | sed '$d')
echo "  HTTP $HTTP"
echo "  $BODY"

[ "$HTTP" = "200" ] || { echo "✗ expected HTTP 200"; exit 1; }

ok() { python3 -c "import json,sys;d=json.loads('''$BODY''');assert $1, 'assertion failed: $1 → '+json.dumps(d)" ; }
ok "d.get('success') is True"
ok "d.get('orderId') == '$ORDER_ID'"
ok "d.get('refundId') is None"
ok "isinstance(d.get('refundError'), str) and 'no stripe payment id' in d['refundError'].lower()"
echo "  ✓ response shape OK (success, no refund attempted as expected)"

echo "▶ Verifying DB side-effects…"
STATUS=$(psql -At -c "SELECT status FROM public.orders WHERE id = '$ORDER_ID';")
NOTES=$(psql -At -c "SELECT notes  FROM public.orders WHERE id = '$ORDER_ID';")
[ "$STATUS" = "cancelled" ] || { echo "✗ order status = $STATUS (want cancelled)"; exit 1; }
case "$NOTES" in *"Cancelled by admin"*) ;; *) echo "✗ notes missing cancellation marker: $NOTES"; exit 1 ;; esac
echo "  ✓ order.status=cancelled, notes=\"${NOTES:0:80}…\""

if [ -n "$PROD_ID" ]; then
  ITEM_STATUS=$(psql -At -c "SELECT fulfillment_status FROM public.order_items WHERE order_id = '$ORDER_ID' LIMIT 1;")
  [ "$ITEM_STATUS" = "cancelled" ] || { echo "✗ item status = $ITEM_STATUS"; exit 1; }
  echo "  ✓ order_items.fulfillment_status=cancelled"
fi

echo
echo "✅ PASS — cancel-and-refund-order works end-to-end with real admin auth."
