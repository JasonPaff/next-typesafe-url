import { withParamValidation } from "next-typesafe-url/app/hoc";
import { $path, type InferPagePropsType } from "next-typesafe-url";
import { Suspense } from "react";
import { Route, type RouteType } from "./routeType";

type PageProps = InferPagePropsType<RouteType>;

const Inner = async ({ searchParams }: PageProps) => {
  const params = await searchParams;

  // passing the Route object as `validator` runs the encode direction of the
  // schema, so `from` is typed as a Date here instead of a string
  const nextWeek = $path({
    route: "/codec-route",
    searchParams: { from: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    validator: Route,
  });

  // codecs can reshape structured data too: this serializes as the compact
  // human-readable "?center=40.7128%2C-74.006" instead of a JSON blob
  const nyc = $path({
    route: "/codec-route",
    searchParams: { center: { lat: 40.7128, lng: -74.006 } },
    validator: Route,
  });

  return (
    <div>
      <h1>
        {params.from
          ? `from is a real Date: ${params.from.toDateString()}`
          : "no `from` param- follow the links below"}
      </h1>
      <h2>
        {params.center
          ? `center is a real object: lat ${params.center.lat}, lng ${params.center.lng}`
          : "no `center` param"}
      </h2>
      <a href={nextWeek}>same page, one week from now</a>
      <br />
      <a href={nyc}>same page, centered on NYC</a>
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
