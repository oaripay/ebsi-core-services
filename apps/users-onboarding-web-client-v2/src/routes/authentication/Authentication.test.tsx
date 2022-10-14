import React from "react";
import { MemoryRouter } from "react-router-dom";
import * as ReactRouterDom from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Authentication } from "./Authentication";
import * as OnboardingHelpers from "../../apis/onboarding";

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock("react-router-dom", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
  ...(jest.requireActual("react-router-dom") as any),
  __esModule: true,
}));

describe("Authentication page", () => {
  it("should redirect the user to the homepage when no EU Login ticket nor reCAPTCHA token is found", () => {
    expect.assertions(1);

    const redirectMock = jest.fn();

    jest.spyOn(ReactRouterDom, "useNavigate").mockImplementation(() => {
      // Do nothing
      return redirectMock;
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Authentication />
      </MemoryRouter>
    );

    // Expect redirection to homepage "/"
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("should render the Authentication page when receiving a ticket from EU Login", async () => {
    expect.assertions(5);

    // Prevent redirection
    const redirectMock = jest.fn();
    jest.spyOn(ReactRouterDom, "useNavigate").mockImplementation(() => {
      // Do nothing
      return redirectMock;
    });

    // Mock EU Login ticket validation (success)
    const validateSessionSpy = jest
      .spyOn(OnboardingHelpers, "validateSession")
      .mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: {
            Bearer: "session token",
          },
        })
      );

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/authentication",
            search: "?ticket=mockedticked", // EU Login ticket
          },
        ]}
      >
        <Authentication />
      </MemoryRouter>
    );

    // The user shouldn't be redirected
    expect(redirectMock).not.toHaveBeenCalled();

    // First, the page is loading the result
    const titleElement = screen.getByText(/Retrieving session token/i);
    expect(titleElement).toBeInTheDocument();

    expect(validateSessionSpy).toHaveBeenCalledWith({
      info: { "eul-ticket": "mockedticked" },
      onboarding: "eu-login",
    });

    // After some time, the page displays the session token
    await waitFor(() => screen.getByText("What kind of wallet are you using?"));

    expect(screen.getByText("Desktop Wallet")).toBeInTheDocument();
    expect(screen.getByText("Mobile Wallet")).toBeInTheDocument();
  });

  it("should render the Authentication page when receiving a token from reCAPTCHA", async () => {
    expect.assertions(3);

    // Prevent redirection
    const redirectMock = jest.fn();
    jest.spyOn(ReactRouterDom, "useNavigate").mockImplementation(() => {
      // Do nothing
      return redirectMock;
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/authentication",
            state: {
              sessionToken: "session token",
            },
          },
        ]}
      >
        <Authentication />
      </MemoryRouter>
    );

    // The user shouldn't be redirected
    expect(redirectMock).not.toHaveBeenCalled();

    // After some time, the page displays the session token
    await waitFor(() => screen.getByText("What kind of wallet are you using?"));

    expect(screen.getByText("Desktop Wallet")).toBeInTheDocument();
    expect(screen.getByText("Mobile Wallet")).toBeInTheDocument();
  });
});
