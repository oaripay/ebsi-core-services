import axios from "axios";
import { session } from "../types";
import validateSession from "./onboarding";
// import * as responsesAPI from "../test/mocks/responsesAPI";
// import * as mocks from "../test/mocks/mocks";

describe("onboarding api", () => {
  const recaptcha: session.SessionRequest = {
    onboarding: "recaptcha",
    info: {
      token:
        "03AGdBq266M2IJ4l95WLBcTNZf5H0UXJWVWKysCeG6ZZLwvOSM0q0LhvxdL773u0m5_RJiS1weHOsiPnmi5dUQSnFPxB0k0VJdmlx6kuVlE8VNXsSRpRT_gJw5nkuA2LYEzmnUR3SrGCDXdgpEvC__j_lUmNeA4pMoT95UHIqOpdHFW26zW_AfmhgwUhoA1phXso9_TTpGwz95KY20hsMIq5NXauq3lEN7IFMycE6rMn6_ZXHlQu1FdgApMx8bKke3zeZwF3MPiif4Vx6iO6nvRteWftEWTin1B9bh3snVyEWGlB4EEO2ju2OOk6JNfAwWb_hXhGoOjtzc-kiktXA8ppan_vEL7zni8xNPkqx0Qs0Krv7zE7VJSzDKxNnAuE0xoQqyVArc5DQF-pTPmOY6fMJmDTq3J3UgNF4n1IV-TfhFISSXeWcxKnNVvJomQHBaRuenFw_WITod",
    },
  };
  const responseAPI: session.SessionResponse = { Bearer: "token" };

  it("should return a 500 error", async () => {
    expect.assertions(2);

    jest.spyOn(axios, "post").mockRejectedValue(new Error("Error"));

    const response = await validateSession(recaptcha);

    expect(response.status).toBe(500);
    expect(response.data).toMatch("Error");
  });

  it("should return a session token", async () => {
    expect.assertions(1);

    jest
      .spyOn(axios, "post")
      .mockResolvedValue({ status: 201, data: responseAPI });
    const response = await validateSession(recaptcha);
    const data = response.data as session.SessionResponse;
    expect(data.Bearer).toBe("token");
  });
});
