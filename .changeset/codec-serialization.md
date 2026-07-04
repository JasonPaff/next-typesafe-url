---
"next-typesafe-url": minor
---

Support custom serialization in `$path` via zod codecs

`$path` now optionally accepts your `Route` object as `validator`. When provided, params are typed as the validator's output types (e.g. `Date` instead of `string`) and are run through the encode direction of the schema before URL serialization, so zod codecs can define bidirectional custom serialization per field. The decode direction already runs during validation in the hooks, HOCs, and `parseServerSideParams`, completing the round trip.
