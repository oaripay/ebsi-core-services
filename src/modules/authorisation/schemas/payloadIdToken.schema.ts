import Joi from "joi";

export const schemaPayloadIdToken = Joi.object({
  iss: "https://self-issued.me",
  sub: Joi.string(),
  aud: Joi.string(),
  exp: Joi.number(),
  iat: Joi.number(),
  sub_jwk: Joi.object(),
  sub_did_verification_method_uri: Joi.string(),
  nonce: Joi.string(),
  claims: Joi.object(),
})
  .and(
    "iss",
    "sub",
    "aud",
    "exp",
    "iat",
    "sub_jwk",
    "sub_did_verification_method_uri",
    "nonce"
  )
  .unknown();

export default schemaPayloadIdToken;
