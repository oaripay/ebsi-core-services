import React from "react";
import { createMemoryHistory } from "history";
import { render, screen } from "@testing-library/react";
import { Authentication } from "./Authentication";

jest.mock("react-router-dom", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
  ...(jest.requireActual("react-router-dom") as any),
  __esModule: true,
  useLocation: () => ({
    pathname: "localhost:3000/example/path",
    search: {
      ticket: "mockedticked",
    },
  }),
}));
describe("Authentication page", () => {
  it("renders the Authentication page", () => {
    expect.assertions(2);

    const history = createMemoryHistory();
    const route = "/some-route?ticket=mockedTicked";
    history.push(route);

    render(<Authentication />);

    const titleElement = screen.getByText(/Choose your authentication method/i);

    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toMatchInlineSnapshot(`
      <h1
        class="ecl-page-header-harmonised__title"
      >
        Choose your authentication method
      </h1>
    `);
  });
});
