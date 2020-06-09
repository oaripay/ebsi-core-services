import EBSI_JWT from "@cef-ebsi/app-jwt";
import { getSession } from "../../src/utils";

describe("session tests", () => {
  it("should return a session object", async () => {
    expect.assertions(1);
    expect(await getSession()).toBeInstanceOf(EBSI_JWT.Session);
  });
});
