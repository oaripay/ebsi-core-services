import { Button, Result, Row, Space } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../../config";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Space direction="vertical" className="content-container" size="middle">
      <Row justify="center" align="middle">
        <Result
          status="404"
          title="404"
          subTitle="Sorry, the page you visited does not exist."
          extra={
            <Button
              type="primary"
              onClick={() =>
                navigate(config.routes.registerDid, { replace: true })
              }
            >
              Back Home
            </Button>
          }
        />
      </Row>
    </Space>
  );
}
