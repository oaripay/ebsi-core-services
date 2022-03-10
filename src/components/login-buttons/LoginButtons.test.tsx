import React from "react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginButtons } from "./LoginButtons";
import * as onboarding from "../../apis/onboarding";
import REQUIRED_VARIABLES from "../../env";

describe("LoginButtons component", () => {
  it("call the API when click the login with captcha", () => {
    expect.assertions(1);

    render(
      <MemoryRouter>
        <LoginButtons />
      </MemoryRouter>
    );

    const validateSessionMock = jest
      .spyOn(onboarding, "default")
      .mockImplementation(() => Promise.resolve({ status: 400, data: {} }));

    fireEvent.click(screen.getByText("Onboard with Captcha"));

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

    render(
      <MemoryRouter>
        <LoginButtons />
      </MemoryRouter>
    );

    jest.spyOn(window.location, "assign").mockImplementation();

    fireEvent.click(screen.getByText("Onboard with EU Login"));

    const urlFormated = encodeURIComponent(
      `${REQUIRED_VARIABLES.REACT_APP_WALLET}/authentication`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(window.location.assign).toHaveBeenCalledWith(
      `${REQUIRED_VARIABLES.REACT_APP_EULOGIN}/login?service=${urlFormated}&renew=false`
    );
  });
});
