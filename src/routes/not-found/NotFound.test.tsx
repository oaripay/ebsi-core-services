import React from "react";
import { render, screen } from "@testing-library/react";
import { NotFound } from "./NotFound";

describe("NotFound page", () => {
  it("renders the NotFound page", () => {
    expect.assertions(2);

    render(<NotFound />);

    const titleElement = screen.getByText(/Page not found/i);

    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toMatchInlineSnapshot(`
      <h1
        class="ecl-page-header-harmonised__title"
      >
        Page not found
      </h1>
    `);
  });
});
