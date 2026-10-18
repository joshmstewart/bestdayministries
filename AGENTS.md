# Architecture rules
- Coffee-page brand artwork uses a dedicated static CDN asset pointer in CoffeeShopHome, keeping page branding independent from menu-item vendor artwork.
- Admin reply files use shared browser/server validation and private storage references resolved by authenticated downloads; the server builds Resend attachments from validated bytes, never caller-provided URLs.
- Test-only handlers authorize with a shared guard before work; CI credentials stay in Node-only helpers and wrappers forward original authorization, preventing browser secret exposure and service-role bypass.
- Menu artwork exceptions are scoped by item IDs in CoffeeShopMenu and share one category poster for related sizes, so adjusting Calvin’s artwork never changes other vendors’ logos.
- Other-member display reads use profiles_public; private profiles remain scoped to own/admin/linked relationships, and friend-code discovery uses authenticated definer RPCs to prevent email enumeration.
- Daily fortune scheduling preserves its existing command and gates the two possible UTC midnight slots by America/Denver local hour, avoiding daylight-saving release delays without changing global cron timezone.
- Joke-category ownership reads and writes use user_joke_categories; deductCoins alone records spending, preventing duplicate ledger entries and invalid store-item references.
- Generator preview updates validate same-collection sticker membership; automatic preview assignment remains null-only and scheduled status functions never write previews, preserving explicit choices.
- SDK CORS imports must use the shared edge CORS extension when browser runtime headers are required, because the SDK header list can lag newer clients.

- LocationAutocomplete must keep one mounted manual input independent of Google; suggestions come only from the places-autocomplete edge function (connector gateway), never from browser Places scripts, because Google auth failures disable inputs it controls.
- Pack cover selection is presentation-only in packCovers/PackOpeningDialog; scratch-card receives only its existing card and collection identifiers so cover variants cannot influence sticker pulls.
- Generator pack-cover URL validation stays inside sticker-admin-api; it only accepts this project's public sticker-images bucket to prevent arbitrary external cover URLs.
- Public funding displays must use aggregate-only funding functions, while donor-row reads remain on authorized own/shared/admin paths, to preserve totals without exposing donor identifiers.

- Public signup roles are allowlisted in the auth lifecycle trigger; trusted create-user assigns privileged roles by atomically replacing only the new default role and recording the authenticated creator, preventing metadata escalation and duplicate-role accounts.
