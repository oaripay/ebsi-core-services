import EBSI_JWT from "@cef-ebsi/app-jwt";
import { getSession, getSessionRequestBody } from "../../src/utils";
import * as config from "../../src/config";

describe("session tests", () => {
  it("should return a session object", async () => {
    expect.assertions(1);
    expect(await getSession()).toBeInstanceOf(EBSI_JWT.Session);
  });

  it("should return a request object", async () => {
    expect.assertions(1);
    const returnedValue =
      "grantType=client_credentials&clientAssertionType=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&clientAssertion=eyJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei90cnVzdGVkLWFwcHMtcmVnaXN0cnkvdjEvYXBwcy9lYnNpLWlkaHViIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3MiOiJlYnNpLWlkaHViIiwic3ViIjoiZWJzaS1pZGh1YiIsImF1ZCI6ImVic2ktaWRodWIiLCJqdGkiOiI5MDRmYmVlZC0wODk3LTQ1YWMtOGJiZS0xMTJmZTk3YmMwOTAiLCJpYXQiOjE1OTE3ODY4MTcsImV4cCI6MTU5MTc4NjgzMn0.UM8cw6wG_ozUhLyxsd7PcFWlbv9P923JrX4tnsA3KiSV47I7RTLodQt-XMwtLj_nDxZajqLLAhTLeJ9RNTIYVQ&scope=openid%20did_authn";
    jest
      .spyOn(EBSI_JWT.Agent.prototype, "newRequest")
      .mockReturnValue(returnedValue);
    expect(await getSessionRequestBody(config.API_NAME)).toMatch(returnedValue);
  });
});
