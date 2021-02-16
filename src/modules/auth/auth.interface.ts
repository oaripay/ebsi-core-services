export interface UserInfo {
  did: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  did: string;
}
