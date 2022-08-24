import React from "react";
import { render, screen } from "@testing-library/react";
import { TermsConditions } from "./TermsConditions";

const mockedUsedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedUsedNavigate,
}));

describe("TermsConditions page", () => {
  it("renders the TermsConditions page", () => {
    expect.assertions(2);

    render(<TermsConditions />);

    const titleElement = screen.getByText("Terms and conditions");

    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toMatchInlineSnapshot(`
      <h1
        class="ecl-page-header-harmonised__title"
      >
        Terms and conditions
      </h1>
    `);
  });
});
