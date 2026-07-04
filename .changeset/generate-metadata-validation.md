---
"next-typesafe-url": minor
---

Add `withMetadataParamValidation` for `generateMetadata` functions

A higher order function (exported from `next-typesafe-url/app/hoc`) that validates the params passed to `generateMetadata` with the same `Route` object as the page, plus a matching `InferGenerateMetadataPropsType` helper type. Params arrive as promises of the validated output types and Next's `parent` metadata is passed through untouched.
