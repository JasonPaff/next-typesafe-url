import {
  withParamValidation,
  withMetadataParamValidation,
} from "next-typesafe-url/app/hoc";
import {
  $path,
  type InferPagePropsType,
  type InferGenerateMetadataPropsType,
} from "next-typesafe-url";
import { Suspense } from "react";
import { Route, type RouteType } from "./routeType";

type PageProps = InferPagePropsType<RouteType>;
type MetadataProps = InferGenerateMetadataPropsType<RouteType>;

async function metadataGenerator({ searchParams }: MetadataProps) {
  const { title } = await searchParams;
  return {
    title: title ?? "metadata example",
  };
}

export const generateMetadata = withMetadataParamValidation(
  metadataGenerator,
  Route,
);

const Inner = async ({ searchParams }: PageProps) => {
  const params = await searchParams;

  return (
    <div>
      <h1>{`the page title is: ${params.title ?? "metadata example"}`}</h1>
      <p>
        The title in the browser tab is validated by the same Route object as
        this page component.
      </p>
      <a
        href={$path({
          route: "/metadata-route/[id]",
          routeParams: { id: 42 },
        })}
      >
        route param + parent metadata passthrough example
      </a>
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
