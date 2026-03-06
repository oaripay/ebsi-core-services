import type { JWTPayload } from "@europeum-ebsi/did-jwt";

export interface Payload extends JWTPayload {
  login_hint: string;
}

export interface SubjectInfo {
  scp: string;
  sub: string;
}

export interface UserInfo {
  did?: string;
  login_hint: string;
  sub: string;
}
