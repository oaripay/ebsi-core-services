import { Result, Row, Space } from "antd";
import React from "react";

export default function Main() {
  return (
    <Space
      direction="vertical"
      align="center"
      className="content-container"
      size="large"
    >
      <Row justify="space-around" align="stretch">
        <Result status="info" title="Hello" subTitle="Welcome to the admin" />
      </Row>
    </Space>
  );
}
