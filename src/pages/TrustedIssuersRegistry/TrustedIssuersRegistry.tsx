import React, { ReactElement } from "react";
import { Space } from "antd";
import TrustedTable from "./TrustedTable";
import AddIssuer from "./AddIssuer";
import { useVerifyNetworkEffectHook } from "../../hooks/use-verify-network-effect.hook";

export default function TrustedIssuersRegistry(): ReactElement {
  useVerifyNetworkEffectHook();
  return (
    <Space direction="vertical" className="content-container" size="middle">
      <h1>Trusted Issuers Registry</h1>
      <AddIssuer />
      <TrustedTable />
    </Space>
  );
}
