"use client";

import { $path, TypedLink } from "next-typesafe-url";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import {
  useSearchParams,
  useRouteParams,
  useTypedRouter,
} from "next-typesafe-url/app";
import { Route } from "./routeType";

export const Client = () => {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
};

export const Inner = () => {
  useEffect(() => {
    console.log("Component has been rendered");
  }, []);

  const [input, setInput] = useState("");
  const [input2, setInput2] = useState("");

  const params = useSearchParams(Route.searchParams);
  const routeParams = useRouteParams(Route.routeParams);
  const router = useTypedRouter();

  return (
    <div className="flex flex-col space-y-5">
      <Link href={$path({ route: "/" })}>Back</Link>
      <br />
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <br />
      <input value={input2} onChange={(e) => setInput2(e.target.value)} />
      <TypedLink
        route="/client/[...client]"
        routeParams={{ client: [input2 === "" ? "default" : input2, 123] }}
        searchParams={{ location: input }}
      >
        hooks
      </TypedLink>
      <button
        onClick={() =>
          router.push({
            route: "/client/[...client]",
            routeParams: {
              client: [input2 === "" ? "default" : input2, 123],
            },
            searchParams: { location: input },
          })
        }
      >
        push via useTypedRouter
      </button>
      <br />
      <h1>searchParams</h1>
      <div>{`data: ${JSON.stringify(params)}`}</div>
      <h1>routeParams</h1>
      <div>{`data: ${JSON.stringify(routeParams)}`}</div>
    </div>
  );
};
