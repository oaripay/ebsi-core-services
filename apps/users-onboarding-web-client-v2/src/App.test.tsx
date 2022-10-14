import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

const mockedUsedNavigate = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock("react-router-dom", () => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedUsedNavigate,
}));

test("renders app", () => {
  render(<App />);
  const linkElement = screen.getByText(
    /An official website of the European Union/i
  );
  expect(linkElement).toBeInTheDocument();
});
