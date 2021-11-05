import { JWTPayload } from "did-jwt";

export interface UserInfo {
  did?: string;
  sub: string;
}

export interface Payload extends JWTPayload {
  login_hint: string;
}
