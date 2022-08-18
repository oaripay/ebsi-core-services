import { addAlgToJwk, prefix0x } from "./authentication.utils";

describe("authentication utils", () => {
  describe("add0xPrefix", () => {
    it("should add '0x' at the beginning of the string", () => {
      expect.assertions(1);

      expect(
        prefix0x(
          "0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
        )
      ).toBe(
        "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      );
    });

    it("should not add '0x' if the string already starts with'0x'", () => {
      expect.assertions(1);

      expect(
        prefix0x(
          "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
        )
      ).toBe(
        "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      );
    });
  });

  describe("add alg to jwk", () => {
    it("should add alg ES256K to jwk", () => {
      const jwk = {
        kty: "EC",
        crv: "secp256k1",
        x: "joooqm4UlWdewHWO24q6VF636Hxu7hYQKTOtjzlIc6E",
        y: "npJLUzk6-15sDH22CNmvjHKFqxjQg_B5znnceU94SDc",
      };

      expect(addAlgToJwk(jwk)).toStrictEqual({
        alg: "ES256K",
        kty: "EC",
        crv: "secp256k1",
        x: "joooqm4UlWdewHWO24q6VF636Hxu7hYQKTOtjzlIc6E",
        y: "npJLUzk6-15sDH22CNmvjHKFqxjQg_B5znnceU94SDc",
      });
    });

    it("should add alg ES256 to jwk", () => {
      const jwk = {
        kty: "EC",
        crv: "P-256",
        x: "zQIIl8Q3vjyqiqQ9i0lhbIOkgRjbgzXV13Bs43JRn3I",
        y: "Cb1FA67VmtwCgPm1fHyU3s_GRTUlOSDNKFjS2OMFVTs",
      };

      expect(addAlgToJwk(jwk)).toStrictEqual({
        alg: "ES256",
        kty: "EC",
        crv: "P-256",
        x: "zQIIl8Q3vjyqiqQ9i0lhbIOkgRjbgzXV13Bs43JRn3I",
        y: "Cb1FA67VmtwCgPm1fHyU3s_GRTUlOSDNKFjS2OMFVTs",
      });
    });

    it("should add alg RS256 to jwk", () => {
      const jwk = {
        kty: "RSA",
        n: "1XbRzTfufAi1VJtgLnLiT3xbcJrxBctiWi181vSejmIuaYxUUFCyI9UX1KOxe_65l77RE68a2dWrDBoiE7KVNmdXewT9n6xT3pqT2bDswYMrmG07o07uAN0VlcxAfOaH56TRCubesNg524jP6LGgtW481EiwGOIrhB4YSCvMeJpBA6aJKT6-S0kuO_CiusRBbFSjjJemAOLm5h8FYTjVvI6WGqurh93tznSshguRRGjIRyGRcvRxvHU89VDXDLXIZUacXdytsqHFZAZyRVjui-RcZAr7LZ4cb9qOYjxBBF4n-L2s8fe1kfgP-XEzK-MK8yZ4gwMv-d7X-7vdHkxmQw",
        e: "AQAB",
      };

      expect(addAlgToJwk(jwk)).toStrictEqual({
        alg: "RS256",
        kty: "RSA",
        n: "1XbRzTfufAi1VJtgLnLiT3xbcJrxBctiWi181vSejmIuaYxUUFCyI9UX1KOxe_65l77RE68a2dWrDBoiE7KVNmdXewT9n6xT3pqT2bDswYMrmG07o07uAN0VlcxAfOaH56TRCubesNg524jP6LGgtW481EiwGOIrhB4YSCvMeJpBA6aJKT6-S0kuO_CiusRBbFSjjJemAOLm5h8FYTjVvI6WGqurh93tznSshguRRGjIRyGRcvRxvHU89VDXDLXIZUacXdytsqHFZAZyRVjui-RcZAr7LZ4cb9qOYjxBBF4n-L2s8fe1kfgP-XEzK-MK8yZ4gwMv-d7X-7vdHkxmQw",
        e: "AQAB",
      });
    });

    it("should add alg EdDSA to jwk", () => {
      const jwk = {
        kty: "OKP",
        crv: "Ed25519",
        x: "eftiRqD3vJY2UKvoUojc6Vy3WW0JhT9qyCeFTJ_BiFU",
      };

      expect(addAlgToJwk(jwk)).toStrictEqual({
        alg: "EdDSA",
        kty: "OKP",
        crv: "Ed25519",
        x: "eftiRqD3vJY2UKvoUojc6Vy3WW0JhT9qyCeFTJ_BiFU",
      });
    });
  });
});
