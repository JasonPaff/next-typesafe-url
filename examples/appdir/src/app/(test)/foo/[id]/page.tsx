import { withParamValidation } from "next-typesafe-url/app/hoc";
import { InferPagePropsType } from "next-typesafe-url";
import { Route, RouteType } from "./routeType";
import { TypedLink } from "next-typesafe-url";
import { Suspense } from "react";

type PageProps = InferPagePropsType<RouteType>;

const Inner = async ({ routeParams }: PageProps) => {
  const params = await routeParams;
  return (
    <div className="border border-black">
      <h1>page</h1>
      <div>{`route: ${JSON.stringify(params)}`}</div>
      {/* TypedLink has no client-only code, so it works in server components */}
      <TypedLink route="/foo/[id]/nest" routeParams={{ id: params.id }}>
        LINK
      </TypedLink>
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
