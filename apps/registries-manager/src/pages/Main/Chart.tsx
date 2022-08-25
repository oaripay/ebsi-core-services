import React, { ReactElement, useMemo } from "react";
import { Column } from "@ant-design/charts";
import useStats from "./useStats";

export default function Chart(): ReactElement {
  const { nrOfSchemas, nrOfPolicies, nrOfTrustedIssuers, nrOfApps } =
    useStats();

  const data = useMemo(
    () => [
      { type: "Nr of Apps", value: nrOfApps },
      { type: "Nr of Trusted Issuers", value: nrOfTrustedIssuers },
      { type: "Nr of Schemas", value: nrOfSchemas },
      { type: "Nr of Policies", value: nrOfPolicies },
    ],
    [nrOfApps, nrOfPolicies, nrOfSchemas, nrOfTrustedIssuers]
  );
  return (
    <Column
      xField="type"
      yField="value"
      data={data}
      color={({ type }) => {
        switch (type) {
          case "Nr of Schemas":
            return "#43a047";
          case "Nr of Policies":
            return "#039be5";
          case "Nr of Trusted Issuers":
            return "#3949ab";
          default:
            return "#757575";
        }
      }}
      xAxis={{
        label: {
          autoHide: true,
          autoRotate: false,
        },
      }}
      label={{
        position: "middle",
        style: {
          fill: "#FFFFFF",
          opacity: 0.6,
        },
      }}
    />
  );
}
