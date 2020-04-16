export interface SignPayload {
  issuer: string;
  payload: any;
  expiresIn?: number; // in seconds
}
