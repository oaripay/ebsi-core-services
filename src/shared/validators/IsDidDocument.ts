import Joi from "joi";
import type {
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
} from "did-resolver";

export const schemaVerificationMethod = Joi.object<VerificationMethod>({
  id: Joi.string().required(),
  type: Joi.string().required(),
  controller: Joi.string().required(),
  publicKeyJwk: Joi.object<VerificationMethod["publicKeyJwk"]>({
    alg: Joi.string(),
    crv: Joi.string(),
    e: Joi.string(),
    ext: Joi.bool(),
    key_ops: Joi.array().items(Joi.string()),
    kid: Joi.string(),
    kty: Joi.string().required(),
    n: Joi.string(),
    use: Joi.string(),
    x: Joi.string(),
    y: Joi.string(),
  }),
  publicKeyMultibase: Joi.string(),

  /**
   * @deprecated
   */
  publicKeyBase58: Joi.string(),
  publicKeyHex: Joi.string(),
  blockchainAccountId: Joi.string(),
  ethereumAddress: Joi.string(),
}).required();

export const schemaDidDocument = Joi.object<DIDDocument>({
  "@context": Joi.alternatives()
    .try(
      Joi.array()
        .min(1)
        .ordered(Joi.string().valid("https://www.w3.org/ns/did/v1").required())
        .required(),
      Joi.string().valid("https://www.w3.org/ns/did/v1").required()
    )
    .required(),
  id: Joi.string().required(),
  alsoKnownAs: Joi.array().items(Joi.string()),
  controller: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  verificationMethod: Joi.array().items(schemaVerificationMethod),
  authentication: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(schemaVerificationMethod)
  ),
  assertionMethod: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(schemaVerificationMethod)
  ),
  keyAgreement: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(schemaVerificationMethod)
  ),
  capabilityInvocation: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(schemaVerificationMethod)
  ),
  capabilityDelegation: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(schemaVerificationMethod)
  ),
  service: Joi.array().items(
    Joi.object<ServiceEndpoint>({
      id: Joi.string().required(),
      type: Joi.string().required(),
      serviceEndpoint: Joi.string().required(),
      description: Joi.string(),
    })
  ),
  /**
   * @deprecated
   */
  publicKey: Joi.array().items(schemaVerificationMethod),
}).unknown();

export const isDidDocument = (input: unknown): input is DIDDocument => {
  const validation = schemaDidDocument.validate(input);
  return !validation.error;
};
