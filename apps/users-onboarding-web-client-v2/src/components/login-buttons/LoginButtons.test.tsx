import React from "react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { LoginButtons } from "./LoginButtons";
import * as onboarding from "../../apis/onboarding";
import REQUIRED_VARIABLES from "../../env";

describe("LoginButtons component", () => {
  it("should not call the API when click the login button with captcha", () => {
    expect.assertions(2);

    render(
      <MemoryRouter>
        <GoogleReCaptchaProvider
          reCaptchaKey={REQUIRED_VARIABLES.REACT_APP_CAPTCHA_KEY}
        >
          <LoginButtons />
        </GoogleReCaptchaProvider>
      </MemoryRouter>
    );

    const validateSessionMock = jest
      .spyOn(onboarding, "default")
      .mockImplementation(() => Promise.resolve({ status: 400, data: {} }));

    const onboardButton = screen.getByText("Onboard with Captcha");
    expect(onboardButton).toBeDisabled();

    // Since the button is disabled until reCAPTCHA returns a token, the click should not trigger any action
    fireEvent.click(onboardButton);
    expect(validateSessionMock).not.toHaveBeenCalled();
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
        <GoogleReCaptchaProvider
          reCaptchaKey={REQUIRED_VARIABLES.REACT_APP_CAPTCHA_KEY}
        >
          <LoginButtons />
        </GoogleReCaptchaProvider>
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
