import { jest } from "@jest/globals";
import axios, { AxiosResponse } from "axios";
import KeyEncoder from "key-encoder";

const keyEncoder = new KeyEncoder("secp256k1");

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const mockAxiosGet = (authorisationApiPublicKey: string) =>
  jest
    .spyOn(axios, "get")
    .mockImplementation((url: string): Promise<Partial<AxiosResponse>> => {
      if (
        url ===
        "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x1111111111111111111111111111111111111111111111111111111111111111"
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            applicationId:
              "0x1111111111111111111111111111111111111111111111111111111111111111",
            name: "authorisation-api",
            domain: "external",
            administrators: [],
            publicKeys: [
              Buffer.from(
                keyEncoder.encodePublic(authorisationApiPublicKey, "raw", "pem")
              ).toString("base64"),
            ],
            info: {},
            authorizations: [{}],
          },
        });
      }

      if (
        url ===
        "https://test.intebsi.xyz/trusted-apps-registry/v3/apps?name=storage-api"
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            items: [
              {
                id: "0x1234",
                name: "storage-api",
                href: "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x1234",
              },
            ],
          },
        });
      }

      if (
        url ===
        "https://test.intebsi.xyz/trusted-apps-registry/v3/apps?name=test-app"
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            items: [
              {
                id: "0x5678",
                name: "test-api",
                href: "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x5678",
              },
            ],
          },
        });
      }

      if (
        url ===
        "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x1234/authorizations?requesterApplicationId=0x5678"
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            items: [
              {
                authorizationId: "0x51dd",
                requesterApplicationName: "test-api",
                href: "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x1234/authorizations/0x51dd",
              },
            ],
          },
        });
      }

      if (
        url ===
        "https://test.intebsi.xyz/trusted-apps-registry/v3/apps/0x1234/authorizations/0x51dd"
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            authorizationId: "0x51dd",
            resourceApplicationId: "0x1234",
            requesterApplicationId: "0x5678",
            resourceApplicationName: "storage-api",
            requesterApplicationName: "test-app",
            iss: "did:ebsi:0x403afb807096bbe7382c36d11b3db2657403ea65",
            permissions: {
              create: "true",
              read: "true",
              update: "true",
              delete: "true",
            },
            status: "active",
            notBefore: Date.now() - 1,
            notAfter: Date.now() + 100000,
          },
        });
      }

      throw new Error(`Calling a non-mocked endpoint: GET ${url}`);
    });

export default mockAxiosGet;
