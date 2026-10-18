# Multiple sticker pack covers
- [x] Investigate next audit item only: RLS. Recorded confirmed anonymous donor-data leak and failed linter with browser/REST evidence; no security or transaction changes applied.
- [ ] Resolve RLS failure: migrate both funding consumers to privacy-safe aggregates, remove broad sponsorship policy after role verification, and review remaining function/view flags. Not fixed this turn.
- [x] Add compatible collection fields.
- [x] Add visual rotate/choose opening and read-only editor previews.
- [x] Extend generator API and document request/response shapes.
- [x] Run focused tests and verify visible flows (23 tests; deployed API readback; signed-in desktop/phone chooser, selected-cover view, and consecutive rotation).
- [ ] Verify Claude restoration to null. Change independently confirmed: description `Claude reversible test 2026-10-18`; inactive collection with 3 covers and choose mode. Audit `8ef520ae-e9fb-4116-91c5-4a0dbf7d2c4b` at 2026-10-18 06:18:50 UTC records only `description`. Awaiting Claude restoration and readback.