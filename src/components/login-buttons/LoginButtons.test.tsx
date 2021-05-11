import React from "react";
import { shallow } from "enzyme";
import { LoginButtons } from "./LoginButtons";
import * as onboarding from "../../apis/onboarding";
import REQUIRED_VARIABLES from "../../env";

describe("LoginButtons component", () => {
  it("call the API when click the login with captcha", () => {
    expect.assertions(1);

    const wrapper = shallow(<LoginButtons />);

    const validateSessionMock = jest
      .spyOn(onboarding, "default")
      .mockImplementation();
    wrapper.find("Button").at(0).simulate("click");

    expect(validateSessionMock).toHaveBeenCalled();
  });

  it("redirect when click the login with EU Login button", () => {
    expect.assertions(1);

    global.window = Object.create(window) as Window & typeof globalThis;
    Object.defineProperty(window, "location", {
      value: {
        assign: jest.fn(),
      },
    });

    const wrapper = shallow(<LoginButtons />);

    jest.spyOn(window.location, "assign").mockImplementation();
    wrapper.find("Button").at(1).simulate("click");

    const urlFormated = encodeURIComponent(
      `${REQUIRED_VARIABLES.REACT_APP_WALLET}/authentication`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(window.location.assign).toHaveBeenCalledWith(
      `${REQUIRED_VARIABLES.REACT_APP_EULOGIN}/login?service=${urlFormated}&renew=false`
    );
  });
});
