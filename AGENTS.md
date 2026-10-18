# Architecture rules
- Joke-category ownership reads and writes use user_joke_categories; deductCoins alone records spending, preventing duplicate ledger entries and invalid store-item references.
- Generator preview updates validate same-collection sticker membership; automatic preview assignment remains null-only and scheduled status functions never write previews, preserving explicit choices.
- SDK CORS imports must use the shared edge CORS extension when browser runtime headers are required, because the SDK header list can lag newer clients.

- LocationAutocomplete must keep one mounted manual input independent of Google; suggestions come only from the places-autocomplete edge function (connector gateway), never from browser Places scripts, because Google auth failures disable inputs it controls.
- Pack cover selection is presentation-only in packCovers/PackOpeningDialog; scratch-card receives only its existing card and collection identifiers so cover variants cannot influence sticker pulls.
- Generator pack-cover URL validation stays inside sticker-admin-api; it only accepts this project's public sticker-images bucket to prevent arbitrary external cover URLs.
- Public funding displays must use aggregate-only funding functions, while donor-row reads remain on authorized own/shared/admin paths, to preserve totals without exposing donor identifiers.
