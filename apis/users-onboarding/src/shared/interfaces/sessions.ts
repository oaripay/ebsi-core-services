export interface CaptchaAuthenticationValidatedInfo {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: number;
  hostname: string;
  "error-codes"?: unknown;
}

export interface CaptchaAuthenticationInfo {
  token: string;
}

export interface EULoginAuthenticationValidatedInfo {
  validatedUser: UserEU;
}

export interface EULoginAuthenticationInfo {
  "eul-ticket": string;
}

export interface UserEU {
  user: string;
  email: string;
  employeeType: string;
  firstname: string;
  lastname: string;
  domain: string;
  domainUsername: string;
  telephoneNumber: string;
  locale: string;
  assuranceLevel: string;
  uid: string;
  teleworkingPriority: string;
  loginDate: string;
  sso: string;
  ticketType: string;
  [x: string]: unknown;
}

export interface SessionToken {
  Bearer: string;
}
