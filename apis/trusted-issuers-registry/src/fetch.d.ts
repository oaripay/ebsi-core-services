import type * as undici from "undici-types";

declare global {
  export const {
    fetch,
    FormData,
    Headers,
    Request,
    Response,
  }: typeof import("undici-types");

  type FormData = undici.FormData;
  type Headers = undici.Headers;
  type HeadersInit = undici.HeadersInit;
  type BodyInit = undici.BodyInit;
  type Request = undici.Request;
  type RequestInit = undici.RequestInit;
  type RequestInfo = undici.RequestInfo;
  type RequestMode = undici.RequestMode;
  type RequestRedirect = undici.RequestRedirect;
  type RequestCredentials = undici.RequestCredentials;
  type RequestDestination = undici.RequestDestination;
  type ReferrerPolicy = undici.ReferrerPolicy;
  type Response = undici.Response;
  type ResponseInit = undici.ResponseInit;
  type ResponseType = undici.ResponseType;
}
