import { EbsiDidAuth, DidAuthRequestCall } from "@cef-ebsi/ebsi-siop-auth";
import { InvalidUserAuthentication } from "../../errors";
import { AuthenticationErrors } from "../../errors/errorCodes";

async function prepareDidAuthRequest(
  redirectUri: string,
  privateKey: string,
  kid: string,
  did: string
): Promise<string> {
  try {
    const didAuthRequestCall: DidAuthRequestCall = {
      redirectUri,
      hexPrivateKey: privateKey,
      issuer: did,
      kid,
    };
    const { uri } = await EbsiDidAuth.createAuthenticationRequest(
      didAuthRequestCall
    );
    return uri;
  } catch (error) {
    throw new InvalidUserAuthentication(
      `${AuthenticationErrors.ERROR_AUTHENTICATION_REQUEST}: ${
        (error as Error).message
      }`
    );
  }
}

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

export { prefix0x, prepareDidAuthRequest };
