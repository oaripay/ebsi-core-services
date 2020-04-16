export enum EBSI_API_ERRORS {
  BAD_REQUEST = "Request failed with status code 400",
  NOT_AUTENTICATED_USER = "Request failed with status code 401",
  UNAUTHORIZED_ACCESS = "Request failed with status code 403",
  NOT_FOUND = "Request failed with status code 404",
  INTERNAL_ERROR = "Request failed with status code 500",
  NOT_IMPLEMENTED = "Request failed with status code 501",
}

export enum EBSI_API_ERRORS_INT {
  BAD_REQUEST_400 = 400,
  NOT_AUTENTICATED_USER_401 = 401,
  UNAUTHORIZED_ACCESS_403 = 403,
  NOT_FOUND_404 = 404,
  INTERNAL_ERROR_500 = 500,
  NOT_IMPLEMENTED_501 = 501,
}

export const getCode = (inErrorMessage: string): EBSI_API_ERRORS_INT => {
  const errorMessage = inErrorMessage.replace("Error: ", "");
  switch (errorMessage) {
    case EBSI_API_ERRORS.BAD_REQUEST:
      return EBSI_API_ERRORS_INT.BAD_REQUEST_400;
    case EBSI_API_ERRORS.NOT_AUTENTICATED_USER:
      return EBSI_API_ERRORS_INT.NOT_AUTENTICATED_USER_401;
    case EBSI_API_ERRORS.UNAUTHORIZED_ACCESS:
      return EBSI_API_ERRORS_INT.UNAUTHORIZED_ACCESS_403;
    case EBSI_API_ERRORS.NOT_FOUND:
      return EBSI_API_ERRORS_INT.NOT_FOUND_404;
    case EBSI_API_ERRORS.INTERNAL_ERROR:
      return EBSI_API_ERRORS_INT.INTERNAL_ERROR_500;
    case EBSI_API_ERRORS.NOT_IMPLEMENTED:
      return EBSI_API_ERRORS_INT.NOT_IMPLEMENTED_501;
    default:
      return 500;
  }
};

export const getMessage = (error: any): string => {
  if (error.response && error.response.data) {
    return <string>error.response.data;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Error in API call";
};

export enum WALLET_API_ERRORS {
  CONNECTION_NOT_OPEN = "Server connection is not set.",
  NO_COMPONENT_PASSWORD = "No Component Wallet provided",
  AUTHMANAGER_ERROR = "Auth Manager not initizalized",
  CALL_SHOULD_THROW = "Call should throw an error",
  COMPONENT_WALLET_ENCRYPTEDKEY_NOT_PROVIDED = "Component wallet needs an ecrypted key to initilize",
  CREDENTIAL_ERROR = "Error on Credential Validation",
  ELEMENT_NOT_INSERTED_FILE_STORAGE_DB = "The element could not be inserted to the File Storage DB",
  ENCLAVE_DID_NULL = "Enclave DID is null",
  ERROR_ON_COMPONENT_WALLET_INIT = "Component Wallet Init must have a EncryptedKeyStore",
  ERROR_ON_DISPATCHING_NOTIFICATION = "Notification could not be processed",
  ERROR_VERIFYING_SIGNATURE = "Error on verifying signature",
  INVALID_DATA_STORE_CONFIG_TYPE = "Wallet Storage Configuration type provides is invalid",
  INVALID_WALLET_STORAGE_TYPE = "Wallet Storage Type provided is invalid",
  KEY_FORMAT_NOT_SUPPORTED = "This key format is not supported",
  NOTIFICATION_CALLBACK_NOT_DEFINED = "Notification callback url not defined",
  NOTIFICATION_DELETION_ERROR = "Notification could not be deleted",
  NOTIFICATION_INSERT_ERROR = "Notification could not be inserted",
  NOTIFICATION_LIST_EMPTY = "Notification List is empty",
  NOTIFICATION_NOT_FOUND = "Notification Not Found",
  NOTIFICATION_RETURN_ENDPOINT_NOT_PROVIDED = "Notification return endpoint not provided.",
  NO_AUTHZ_TOKEN = "No AuthZ Token.",
  NO_BEARER_TOKEN = "No Bearer Token.",
  NO_CONFIG_TRUSTED_APP_NAMES = "No configuration found for Trusted App Names",
  NO_CREDINFO_FOUND = "Credential Info object not found",
  NO_DATA_NOTIFICATION = "Notification has no data",
  NO_EBSI_SERVICE_AVAILABLE = "The current EBSI SERVICE specified is not available",
  NO_SUBSCRIBER_URL = "Requester needs to provide an URL to send the presentation",
  NO_TARGET_APP_INFO = "No target app info available on Auth Manager",
  NO_TX_COUNT_RECEIVED = "No transaction count received from wallet address",
  PRESENTATION_HASH_NOT_FOUND = "Could not retrieve presentation's hash",
  PRESENTATION_PAYLOAD_ERROR = "Error creating the presentation payload",
  PRESENTATION_FULL_PAYLOAD_ERROR = "Error creating the presentation payload with proof",
  QUEUE_ELEMENT_WITHOUD_ID = "Queue element returned does not have an Id attribute",
  REQUESTER_NOTFIED_ERROR = "Error on notifying the requester",
  VERIFIABLEID_ERROR = "Error on Verifiable ID Validation",
  DIPLOMA_ERROR = "Error on Diploma Validation",
  WALLET_NOT_FOUND = "Wallet not found",
  WRONG_FORWARD_NOTIFICATION_DISPATCH = "Notification has been dispatched to the wrong forward path",
  PROOF_NOT_FOUND = "Proof not found in a Verfiable Credential",
  ERROR_SENDING_NOTIFICATION = "Notification could not be sent to the wallet",
  ERROR_SIGNATURE_CREATION = "Error on creating the JWS Signature",
  ERROR_EUTICKET_VALIDATION = "Error on validating the EU Login ticket",
  NO_VALIDATION_SERVICE_ENDPOINT = "No Validation Service Endpoint set",
  NO_REDIRECT_URL_PROVIDED = "No redirect URL provided to send the response",
  ENTERPRISE_PASSWORD_PROVIDED = "Enterprise Wallet does not require password to be provided",
  NO_KEY_LOADED = "Error on loading Wallet Key",
  NO_DID_PROVIDED = "Error on loading Enterprise Keys, DID must be provided",
  PUBLIC_KEY_NOT_FOUND = "Public key not found for the given DID",
  NO_TRUSTED_ISSUER = "Trusted Issuer information not provided",
  NO_TRUSTED_ISSUER_FOUND = "Trusted Issuer not found",
  TRUSTED_ISSUER_BAD_STATUS = "Trusted Issuer is registered with bad status",
  TRUSTED_ISSUER_DID_MISMATCH = "Trusted Issuer provided does not match the JWT did",
  DID_NOT_DEFINED = "DID parameter from call or from the JWT token is not defined",
  DID_MISMATCH = "DID parameter from call differs from the AuthZToken DID provided",
  WALLET_OPTIONS_NOT_PROVIDED = "Wallet options parameters are not provided",
}

export enum WALLET_MESSAGES {
  ELEMENT_DELETED = "Message deleted",
  ELEMENT_ADDED = "Message inserted",
  KEY_ADDED = "key inserted",
  VERIFIABLEID_VERIFIED = "Verifiable Id validated successfully",
  ATTESTATION_VERIFIED = "Attestation validated successfully",
  NOTIFICATION_ACCEPTED_OK = "Notification processed successfully",
  REQUESTER_NOTIFIED_OK = "Requester has been notified successfully",
  PRESENTATION_VALIDATED_OK = "Presentation validated successfully",
  VID_CREATED_OK = "The request is successfully processed. Please, redirect to the designated URL to accept your notification",
  SIGNATURE_VALIDATED_OK = "Signature validated successfully",
}
