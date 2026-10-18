# Coin deduction audit

## Confirmed joke purchase failure
The selector deducted coins, then wrote nonexistent `item_type`/`item_name` fields to `user_store_purchases`; its category UUID also did not reference a store item. Ownership must be written and read through `user_joke_categories(user_id, category_id, coins_spent)`.

The corrected selector invokes `deductCoins` once with the category ID and does not insert a second spending ledger row. Errors use the shared copyable error helper. No permissions or edge functions changed.

## Remaining failures
This is not a completed coin audit. Manual client-side spending remains in ColoringBook, CardCreator, useStorePurchases, MemoryMatch mode unlocking and usePet. The shared hook separately updates balance and inserts its ledger row; concurrent deductions and purchase failures are not atomic. Existing hook callers can also charge before an entitlement write fails. These require coordinated remediation and separate real-flow verification before this item can pass.

## Evidence
Persistent test user `026c7daa-aab4-426a-b6e9-0e437ea5317e`: the failed Holidays purchase created spending row `93d16ede-299a-4407-9e8b-dc34306266a5` for -50; balance became zero and no ownership was created. Preserve this row; any test reimbursement must be an additive credit, not deletion.

Reimbursement `c14343b3-a65a-43b0-b476-ae14fbfa4985` credited 50 before re-test. Corrected live UI purchase created one -50 spending row `da32a9e6-cf87-44cf-b76e-14319e37e648` with category reference, ownership `59393b33-25f3-4fbe-93c4-6fc035c700ac`, and displayed nine unlocked categories and balance zero. Screenshot: `/tmp/browser/coin-audit/baseline-purchased.png`. No records deleted or real-money operations performed.