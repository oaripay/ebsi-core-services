import { JWTHeader, JWTPayload } from "did-jwt";

export interface UserInfo {
  did?: string;
  sub: string;
}

export interface Header extends JWTHeader {
  kid: string;
}

export interface Payload extends JWTPayload {
  login_hint: string;
}

export interface JWTDecoded {
  header: Header;
  payload: Payload;
}
