import React, { ReactElement, useEffect } from "react";
import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import useUsers from "../useUsers";
import InsertUserAttributesForm from "../modal/InsertUserAttributesForm";
import UsersTable from "../tables/UsersTable";

export default function UsersTab(): ReactElement {
  const {
    getUsers,
    showInsertUserAttrModal,
    hideUserInsertUserAttrModal,
    showUserInsertUserAttrModal,
    insertUserAttrForm,
    insertUserAttributes,
  } = useUsers();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  return (
    <Space direction="vertical">
      <Button type="primary" onClick={showUserInsertUserAttrModal}>
        <PlusOutlined /> Insert User Attributes
      </Button>
      <InsertUserAttributesForm
        submit={insertUserAttributes}
        form={insertUserAttrForm}
        show={showInsertUserAttrModal}
        hideModal={hideUserInsertUserAttrModal}
      />
      <UsersTable />
    </Space>
  );
}
