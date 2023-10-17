import { URLSearchParams } from "node:url";
import { randomUUID } from "node:crypto";
import axios, { type AxiosResponse } from "axios";
import { ConfigService } from "@nestjs/config";
import {
  Agent as SiopAgent,
  AkeResponse,
  verifyJwtTar,
} from "@cef-ebsi/siop-auth";
import { exportJWK, generateKeyPair, importJWK } from "jose";
import { encode } from "@ebsiint-api/shared";
import { createVP } from "./verifiablePresentation.js";
import { createVerifiableAuthorisation } from "./verifiableAuthorisation.js";
import type { ApiConfig } from "../../src/config/configuration.js";

export const requestSiopJwt = async ({
  configService,
}: {
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> => {
  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  const clientKid = configService.get<string>("testClientKid");
  const clientPrivateKey = configService.get<string>("testClientPrivateKey");
  let authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  let trustedAppsRegistryUrl = configService.get<string>(
    "trustedAppsRegistryApiUrl",
  );

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
    trustedAppsRegistryUrl = trustedAppsRegistryUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
  }

  const siopAgent = new SiopAgent({
    privateKey: await importJWK(
      encode.privateKey.fromHexToJWK(clientPrivateKey),
      alg,
    ),
    kid: clientKid,
    alg,
    siopV2: true,
  });

  // 1. First, the client calls /authentication-requests
  const authenticationRequestsResponse = await axios.post<
    { scope: string },
    AxiosResponse<string>
  >(`${authorisationApiUrl}/authentication-requests`, {
    scope: "openid did_authn",
  });

  // 2. The client verifies the response
  const uri = authenticationRequestsResponse.data;

  const urlParams = new URLSearchParams(uri.replace("openid://?", ""));
  const params = Object.fromEntries(urlParams);
  Object.keys(params).forEach((k) => {
    params[k] = decodeURIComponent(params[k]);
  });
  const { payload } = await verifyJwtTar(params.request, {
    trustedAppsRegistry: `${trustedAppsRegistryUrl}/apps`,
  });

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const authenticationResponse = await siopAgent.createResponse({
    nonce,
    redirectUri: payload.client_id as string,
    claims: {
      encryption_key: publicEncryptionKeyJwk,
    },
    responseMode: "form_post",
  });

  const { idToken } = authenticationResponse;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post<
    string,
    AxiosResponse<AkeResponse>
  >(
    `${authorisationApiUrl}/siop-sessions`,
    new URLSearchParams({ id_token: idToken || "" }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await SiopAgent.verifyAkeResponse(
    siopSessionsResponse.data,
    {
      nonce,
      privateEncryptionKeyJwk,
      trustedAppsRegistry: `${trustedAppsRegistryUrl}/apps`,
      alg,
    },
  );

  return accessToken;
};

// Get SIOP JWT as a new (unregistered) user
export const requestNewUserSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  configService,
}: {
  clientKid: string;
  clientPrivateKey: string;
  configService: ConfigService<ApiConfig, true>;
}): Promise<string> => {
  let authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  const authorisationCredentialSchema = configService.get<string>(
    "authorisationCredentialSchema",
  );
  const usersOnboardingApiPrivateKey = configService.get<string>(
    "usersOnboardingApiPrivateKey",
  );
  const usersOnboardingApiDid = configService.get<string>(
    "usersOnboardingApiDid",
  );
  let trustedAppsRegistryUrl = configService.get<string>(
    "trustedAppsRegistryApiUrl",
  );
  let ebsiAuthority = configService
    .get<string>("domain")
    .replace(/^https?:\/\//, "");

  // Use TEST_LB_DOMAIN if defined
  if (configService.get<string>("testLoadBalancerDomain")) {
    authorisationApiUrl = authorisationApiUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
    trustedAppsRegistryUrl = trustedAppsRegistryUrl.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
    ebsiAuthority = ebsiAuthority.replace(
      configService.get<string>("domain"),
      configService.get<string>("testLoadBalancerDomain"),
    );
  }

  const verifiableCredential = await createVerifiableAuthorisation(
    clientKid.split("#")[0],
    authorisationCredentialSchema,
    usersOnboardingApiPrivateKey,
    usersOnboardingApiDid,
    ebsiAuthority,
  );

  const nonce = randomUUID();

  const verifiablePresentation = await createVP({
    vc: verifiableCredential,
    clientKid,
    clientPrivateKey,
    audience: "",
    ebsiAuthority,
  });

  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  const agent = new SiopAgent({
    privateKey: await importJWK(
      encode.privateKey.fromHexToJWK(clientPrivateKey),
      alg,
    ),
    kid: clientKid,
    alg,
    siopV2: true,
  });

  const authenticationResponse = await agent.createResponse({
    nonce,
    redirectUri: "/siop-sessions",
    responseMode: "form_post",
    claims: {
      encryption_key: publicEncryptionKeyJwk,
    },
    _vp_token: {
      presentation_submission: {
        // The presentation_submission object MUST contain an id property.
        // The value of this property MUST be a unique identifier, such as a UUID.
        id: randomUUID(),
        // The presentation_submission object MUST contain a definition_id property.
        // The value of this property MUST be the id value of a valid Presentation Definition.
        definition_id: randomUUID(),
        // The presentation_submission object MUST include a descriptor_map property.
        // The value of this property MUST be an array of Input Descriptor Mapping Objects, composed as follows:
        descriptor_map: [
          {
            // The descriptor_map object MUST include an id property.
            // The value of this property MUST be a string that matches the id property of the Input Descriptor in the Presentation Definition that this Presentation Submission is related to.
            id: randomUUID(),
            // The descriptor_map object MUST include a format property.
            // The value of this property MUST be a string that matches one of the Claim Format Designation. This denotes the data format of the Claim.
            format: "jwt_vp",
            // The descriptor_map object MUST include a path property.
            // The value of this property MUST be a JSONPath string expression. The path property indicates the Claim submitted in relation to the identified Input Descriptor, when executed against the top-level of the object the Presentation Submission is embedded within.
            path: "$",
            // The object MAY include a path_nested object to indicate the presence of a multi-Claim envelope format.
            // This means the Claim indicated is to be decoded separately from its parent enclosure.
            path_nested: {
              id: "onboarding-input-id",
              format: "jwt_vc",
              path: "$.vp.verifiableCredential[0]",
            },
          },
        ],
      },
    },
  });

  const { idToken } = authenticationResponse;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post<
    string,
    AxiosResponse<AkeResponse>
  >(
    `${authorisationApiUrl}/siop-sessions`,
    new URLSearchParams({
      id_token: idToken || "",
      vp_token: verifiablePresentation,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const accessToken = await SiopAgent.verifyAkeResponse(
    siopSessionsResponse.data,
    {
      nonce,
      privateEncryptionKeyJwk,
      trustedAppsRegistry: `${trustedAppsRegistryUrl}/apps`,
      alg,
    },
  );

  return accessToken;
};
