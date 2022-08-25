import React, { ReactElement, useEffect } from "react";
import { Button, Space } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import UserAttributesTable from "../tables/UserAttributesTable";
import useUserAttributes from "../useUserAttributes";
import { config } from "../../../config";

export default function UserAttributePage({
  address,
}: {
  address: string;
}): ReactElement {
  const { getUserAttributes } = useUserAttributes();
  const { push } = useHistory();

  useEffect(() => {
    getUserAttributes(address);
  }, [address, getUserAttributes]);

  return (
    <Space direction="vertical" size="middle">
      <h3>{address}</h3>
      <Button
        onClick={() =>
          push(config.routes.trustedPoliciesRegistry, { showAttributes: true })
        }
      >
        <LeftOutlined /> Back to policies
      </Button>
      <UserAttributesTable address={address} />
    </Space>
  );
}
