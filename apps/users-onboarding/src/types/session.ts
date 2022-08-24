export interface SessionRequest {
  onboarding: string;
  info: EULoginResponse | CaptchaResponse;
}

export interface EULoginResponse {
  "eul-ticket": string;
}
export interface CaptchaResponse {
  token: string;
}

export interface SessionResponse {
  Bearer: string;
}
