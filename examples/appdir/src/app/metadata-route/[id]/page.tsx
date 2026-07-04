import {
  withParamValidation,
  withMetadataParamValidation,
} from "next-typesafe-url/app/hoc";
import type {
  InferPagePropsType,
  InferGenerateMetadataPropsType,
} from "next-typesafe-url";
import type { ResolvingMetadata } from "next";
import { Suspense } from "react";
import { Route, type RouteType } from "./routeType";

type PageProps = InferPagePropsType<RouteType>;
type MetadataProps = InferGenerateMetadataPropsType<RouteType>;

// uses a validated route param AND composes with the parent metadata
// (the "Metadata Examples" title set by the layout above this page)
async function metadataGenerator(
  props: MetadataProps,
  parent: ResolvingMetadata,
) {
  const routeParams = await props.routeParams;
  const parentMetadata = await parent;

  return {
    title: `item ${routeParams.id} | ${parentMetadata.title?.absolute ?? ""}`,
  };
}

export const generateMetadata = withMetadataParamValidation(
  metadataGenerator,
  Route,
);

const Inner = async ({ routeParams }: PageProps) => {
  const params = await routeParams;

  return (
    <div>
      <h1>{`the id is: ${params.id}`}</h1>
      <p>
        The browser tab shows &quot;item {params.id} | Metadata Examples&quot;-
        the id comes from the validated route param, the suffix from the parent
        layout&apos;s metadata via the passthrough.
      </p>
    </div>
  );
};

const Page = (props: PageProps) => {
  return (
    <Suspense>
      <Inner {...props} />
    </Suspense>
  );
};

export default withParamValidation(Page, Route);
