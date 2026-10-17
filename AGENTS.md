# Architecture rules

- LocationAutocomplete must keep one mounted manual input independent of Google; suggestions come only from the places-autocomplete edge function (connector gateway), never from browser Places scripts, because Google auth failures disable inputs it controls.