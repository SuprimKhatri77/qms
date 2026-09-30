import type { Request } from "express";
import type { auth } from "@/lib/auth";
import type { fromNodeHeaders } from "better-auth/node";

export type HeadersType = ReturnType<typeof fromNodeHeaders>;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
export type User = NonNullable<Session>["user"];

// A request whose JSON body is `TBody` (checked by the validate() middleware
// before the controller runs). `TParams` names the route's path params, e.g.
// { slug: string }; by default it's Express's own "any named string params".
// The response body type is set on the Response instead, so it's unknown here.
export type RequestWithBody<
  TBody,
  TParams extends Record<string, string> = Record<string, string>,
> = Request<TParams, unknown, TBody>;

// What requireAuth adds to a request.
type SignedIn = {
  session: NonNullable<Session>;
  user: User;
};

// Generic over the request's own type, so a RequestWithBody<…> keeps its
// typed body after this check. Asserting a plain Request instead would merge
// in Express's default body type (any) and quietly untype req.body.
export function assertAuthenticated<TRequest extends Request>(
  req: TRequest,
): asserts req is TRequest & SignedIn {
  if (!req.session || !req.user) {
    throw new Error("Expected authenticated request");
  }
}
