import { loginLink, logout } from "./ecas";
import REQUIRED_VARIABLES from "../env";

describe("ecas api", () => {
  it("should return the EU login url", () => {
    expect.assertions(1);

    const loginURLMocked = `login?service=${encodeURIComponent(
      REQUIRED_VARIABLES.REACT_APP_WALLET
    )}%2Fauthentication&renew=false`;

    const urlLogin = loginLink();

    expect(urlLogin).toBe(
      `${REQUIRED_VARIABLES.REACT_APP_EULOGIN}/${loginURLMocked}`
    );
  });

  it("should call the assign method with the url link in EU logout", () => {
    expect.assertions(1);
    global.window = Object.create(window) as Window & typeof globalThis;
    Object.defineProperty(window, "location", {
      value: {
        assign: jest.fn(),
      },
    });
    const urlFormated = encodeURIComponent(REQUIRED_VARIABLES.REACT_APP_WALLET);
    jest.spyOn(window.location, "assign").mockImplementation();
    logout();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(window.location.assign).toHaveBeenCalledWith(
      `${REQUIRED_VARIABLES.REACT_APP_EULOGIN}/logout?service=${urlFormated}&renew=false`
    );
  });
});
