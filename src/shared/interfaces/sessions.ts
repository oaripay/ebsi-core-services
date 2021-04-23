export interface CaptchaAuthenticationInfo {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: number;
  hostname: string;
  "error-codes"?: unknown;
}

export interface EULoginAuthenticationInfo {
  "eul-ticket": string;
}

export interface UserEU {
  user: string;
  departmentNumber: string;
  email: string;
  employeeNumber: string;
  employeeType: string;
  firstname: string;
  lastname: string;
  domain: string;
  domainUsername: string;
  telephoneNumber: string;
  locale: string;
  assuranceLevel: string;
  uid: string;
  orgId: string;
  teleworkingPriority: string;
  loginDate: string;
  sso: string;
  ticketType: string;
}

export interface SessionToken {
  Bearer: string;
}
