import React from "react";
import { render, screen } from "@testing-library/react";
import { TermsConditions } from "./TermsConditions";

describe("TermsConditions page", () => {
  it("renders the TermsConditions page", () => {
    expect.assertions(2);

    render(<TermsConditions />);

    const titleElement = screen.getByText("Terms and conditions");

    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toMatchInlineSnapshot(`
      <h1
        class="ecl-u-type-heading-1 ecl-u-type-color-white"
      >
        Terms and conditions
      </h1>
    `);
  });
});
