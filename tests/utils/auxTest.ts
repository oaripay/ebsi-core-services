import base64url from "base64url";
import type { Credential } from "@cef-ebsi/verifiable-credential";

const extractIatFromJwt = (jwt: string): number => {
  const token = jwt.split(".");
  const payload = base64url.decode(token[1]);
  return (JSON.parse(payload) as Credential).iat as number;
};

export default extractIatFromJwt;
