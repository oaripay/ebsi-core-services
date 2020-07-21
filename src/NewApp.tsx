import { Button, Row, Space } from "antd";
import React, { useState } from "react";
import { PlusOutlined } from "@ant-design/icons/lib";

import { ModalRegisterApp } from "./Modals/ModalRegisterApp";

import { Search } from "./Search";
import { Table } from "./Table";

export function NewApp() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <ModalRegisterApp
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
      <Space direction="vertical" className="content-container" size="middle">
        <Row justify="space-between">
          <Search />
          <Button
            type="primary"
            onClick={() => setShowAddModal(true)}
            size="large"
          >
            <PlusOutlined />
            Add new app
          </Button>
        </Row>
        <Table />
      </Space>
    </>
  );
}
