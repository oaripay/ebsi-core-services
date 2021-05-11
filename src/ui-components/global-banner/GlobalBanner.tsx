import React from "react";
import logo from "../../assets/logo-eu.svg";
import { MemoizedLink } from "../link/Link";

const styles = {
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const logoStyles = {
  border: "1px solid #7f99cc",
  boxSizing: "border-box" as const,
};

export function GlobalBanner(): JSX.Element {
  return (
    <div
      className="ecl-u-bg-grey-100 ecl-u-pl-m ecl-u-pv-xs ecl-u-d-flex"
      style={styles}
    >
      <img src={logo} width={24} alt="EU flag" style={logoStyles} />
      <span className="ecl-u-type-color-white ecl-u-type-s ecl-u-ml-s">
        An official website of the European Union
      </span>
      <MemoizedLink
        className="ecl-u-type-color-white ecl-u-type-s ecl-u-ml-s"
        to="/example"
        variant="standalone"
        icon={{
          shape: "ui--corner-arrow",
          size: "fluid",
          transform: "rotate-180",
        }}
        label="How do you know?"
      />
    </div>
  );
}

export default GlobalBanner;
