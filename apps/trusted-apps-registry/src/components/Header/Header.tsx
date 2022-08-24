import { Button, Layout, Typography, Row } from "antd";
import React from "react";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useMenuContext } from "../Menu/Menu.context";

export default function Header() {
  const { Header: HeaderAntd } = Layout;
  const { Title } = Typography;
  const { collapsed, setCollapsed } = useMenuContext();
  return (
    <HeaderAntd style={{ position: "fixed", zIndex: 4, width: "100%" }}>
      <Row align="middle">
        <Button type="primary" onClick={() => setCollapsed(!collapsed)}>
          {React.createElement(
            collapsed ? MenuUnfoldOutlined : MenuFoldOutlined
          )}
        </Button>
        <Title className="header-text m-b-0" level={2}>
          EBSI Registries Manager
        </Title>
      </Row>
    </HeaderAntd>
  );
}
