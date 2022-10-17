import React from "react";
import { shallow } from "enzyme";
import { Terms } from "./Terms";

describe("Terms component", () => {
  it("when change the checkbox call the method setTermsSelected", () => {
    expect.assertions(1);
    const setTermsSelected = jest.fn();
    const wrapper = shallow(
      <Terms isTermsSelected setTermsSelected={setTermsSelected} />
    );

    wrapper.find("input").at(0).simulate("change");

    expect(setTermsSelected).toHaveBeenCalled();
  });
});
