import React from "react";
import { createMemoryHistory } from "history";
import { render, screen } from "@testing-library/react";
import { Authentication } from "./Authentication";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
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
