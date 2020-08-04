export enum ApiErrorMessages {
  COMPONENT_KEY_NOT_PROVIDED = "Component needs key to initilize",
  ENCLAVE_DID_NULL = "Enclave DID is null",
  ERROR_ON_COMPONENT_WALLET_INIT = "Component Wallet Init must have a EncryptedKeyStore",
  INVALID_DATA_STORE_CONFIG_TYPE = "Wallet Storage Configuration type provides is invalid",
  INVALID_WALLET_STORAGE_TYPE = "Wallet Storage Type provided is invalid",
  NO_AUTHZ_TOKEN = "No AuthZ Token.",
  NO_BEARER_TOKEN = "No Bearer Token.",
  NO_EBSI_SERVICE_AVAILABLE = "The current EBSI SERVICE specified is not available",
  NO_TARGET_APP_INFO = "No target app info available on Auth Manager",
  WALLET_NOT_FOUND = "Wallet not found",
  WALLET_OPTIONS_NOT_PROVIDED = "Wallet options parameters are not provided",
  ATTRIBUTES_DID_HASH_NOT_FOUND = "Attribute hash or did in token not found",
  ATTRIBUTES_DID_NOT_FOUND = "The format of did parameter is not valid",
  ATTRIBUTES_TYPE_NOT_FOUND = "The format of type parameter is not valid",
  ATTRIBUTE_TYPE_MALFORMED = `"type" must be url-encoded type, e.g. encodeURIComponent(JSON.stringify(["EssifVerifiableID", "EuropassDiploma"]))`,
  ATTRIBUTE_INPUT_MALFORMED = `Attribute must contain id, type, name, data and data.base64`,
  ERROR_STORING_FILE = "Error storing file",
  HASH_MISMATCH = "File hash provided mismatches from the file hash stored.",
  ATTRIBUTES_MISMATCH = "Trying to store same hash with different data file",
}

export default { ApiErrorMessages };
