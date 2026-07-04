---
"next-typesafe-url": minor
---

Support custom serialization in `$path` via zod codecs

`$path` now optionally accepts your `Route` object as `validator`. When provided, params are typed as the validator's output types (e.g. `Date` instead of `string`) and are run through the encode direction of the schema before URL serialization, so zod codecs can define bidirectional custom serialization per field. The decode direction already runs during validation in the hooks, HOCs, and `parseServerSideParams`, completing the round trip.

If a route's schemas contain a codec, `validator` is required- omitting it is a compile error rather than a silently mis-serialized URL. Codec detection is structural and type-level only: one-way `.transform()`s and `.default()`s do not trigger the requirement, and routes without codecs are unaffected.
