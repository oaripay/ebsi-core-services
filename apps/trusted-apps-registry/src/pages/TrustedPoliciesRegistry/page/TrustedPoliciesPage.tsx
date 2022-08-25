import React, { ReactElement, useEffect, useState } from "react";
import { Space, Tabs } from "antd";
import { useParams } from "react-router-dom";
import usePolicies from "../usePolicies";
import PoliciesTab from "../tabs/PoliciesTab";
import UsersTab from "../tabs/UsersTab";

export default function TrustedPoliciesPage(): ReactElement {
  const { getPolicies } = usePolicies();

  useEffect(() => {
    getPolicies();
  }, [getPolicies]);
  const { state }: { state?: { showAttributes: boolean } } = useParams();
  const [activeKey, setActiveKey] = useState(
    state?.showAttributes ? "users" : "policies"
  );

  return (
    <Space direction="vertical" size="middle">
      <Tabs
        type="card"
        onChange={(key: string) => {
          setActiveKey(key);
        }}
        activeKey={activeKey}
      >
        <Tabs.TabPane tab="Policies" key="policies">
          <PoliciesTab />
        </Tabs.TabPane>
        <Tabs.TabPane tab="User with attributes" key="users">
          <UsersTab />
        </Tabs.TabPane>
      </Tabs>
    </Space>
  );
}
