import Joi from "joi";
import type {
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
} from "did-resolver";

export const verificationMethodSchema = Joi.object<VerificationMethod>({
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

export const contextSchema = Joi.alternatives()
  .try(
    Joi.array()
      .min(1)
      .items(Joi.string().uri())
      .ordered(Joi.string().valid("https://www.w3.org/ns/did/v1").required())
      .required(),
    Joi.string().valid("https://www.w3.org/ns/did/v1").required(),
  )
  .required();

export const didDocumentSchema = Joi.object<DIDDocument>({
  "@context": contextSchema,
  id: Joi.string().required(),
  alsoKnownAs: Joi.array().items(Joi.string()),
  controller: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string(),
  ),
  verificationMethod: Joi.array().items(verificationMethodSchema),
  authentication: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(verificationMethodSchema),
  ),
  assertionMethod: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(verificationMethodSchema),
  ),
  keyAgreement: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(verificationMethodSchema),
  ),
  capabilityInvocation: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(verificationMethodSchema),
  ),
  capabilityDelegation: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.array().items(verificationMethodSchema),
  ),
  service: Joi.array().items(
    Joi.object<ServiceEndpoint>({
      id: Joi.string().required(),
      type: Joi.string().required(),
      serviceEndpoint: Joi.string().required(),
      description: Joi.string(),
    }),
  ),
  /**
   * @deprecated
   */
  publicKey: Joi.array().items(verificationMethodSchema),
}).unknown();

export const isDidDocument = (input: unknown): input is DIDDocument => {
  const validation = didDocumentSchema.validate(input);
  return !validation.error;
};
