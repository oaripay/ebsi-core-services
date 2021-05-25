import React from "react";
import { shallow } from "enzyme";
import { WalletButtons } from "./WalletButtons";

describe("Wallet Buttons component", () => {
  it("call the click the button to display the session for desktop", () => {
    expect.assertions(1);
    const setWalletOption = jest.fn();
    const wrapper = shallow(
      <WalletButtons setWalletOption={setWalletOption} />
    );

    wrapper.find("Button").at(0).simulate("click");

    expect(setWalletOption).toHaveBeenCalledWith("Desktop Wallet");
  });

  it("call the click the button to display the session for mobile", () => {
    expect.assertions(1);
    const setWalletOption = jest.fn();
    const wrapper = shallow(
      <WalletButtons setWalletOption={setWalletOption} />
    );

    wrapper.find("Button").at(1).simulate("click");

    expect(setWalletOption).toHaveBeenCalledWith("Mobile Wallet");
  });

  it("call the click the button to display the session for ebsi", () => {
    expect.assertions(1);
    const setWalletOption = jest.fn();
    const wrapper = shallow(
      <WalletButtons setWalletOption={setWalletOption} />
    );

    wrapper.find("Button").at(2).simulate("click");

    // Button "EBSI Web Wallet" is disabled, nothing happens
    expect(setWalletOption).toHaveBeenCalledTimes(0);
  });
});
