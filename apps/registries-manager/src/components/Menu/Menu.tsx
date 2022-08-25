import React from "react";
import { Layout, Menu as MenuAntd } from "antd";
import {
  AppstoreOutlined,
  HomeOutlined,
  KeyOutlined,
  UserAddOutlined,
  DeploymentUnitOutlined,
  CarryOutOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { useMenuContext } from "./Menu.context";
import s from "./style.module.css";
import { config } from "../../config";

const { Sider } = Layout;

export default function Menu() {
  const { collapsed } = useMenuContext();
  const location = useLocation();
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className={s.siderContainer}
      width={220}
    >
      <MenuAntd
        defaultSelectedKeys={[]}
        defaultOpenKeys={[]}
        selectedKeys={[location.pathname]}
        mode="inline"
        theme="dark"
      >
        <MenuAntd.Item key={config.routes.default} icon={<HomeOutlined />}>
          <Link to={config.routes.default}>Home</Link>
        </MenuAntd.Item>
        <MenuAntd.Item
          key={config.routes.registerDid}
          icon={<UserAddOutlined />}
        >
          <Link to={config.routes.registerDid}>DID Registry</Link>
        </MenuAntd.Item>
        <MenuAntd.Item
          key={config.routes.trustedAppsRegistry}
          icon={<AppstoreOutlined />}
        >
          <Link to={config.routes.trustedAppsRegistry}>
            Trusted Apps Registry
          </Link>
        </MenuAntd.Item>
        <MenuAntd.Item
          key={config.routes.trustedIssuersRegistry}
          icon={<KeyOutlined />}
        >
          <Link to={config.routes.trustedIssuersRegistry}>
            Trusted Issuers Registry
          </Link>
        </MenuAntd.Item>
        <MenuAntd.Item
          key={config.routes.trustedSchemaRegistry}
          icon={<DeploymentUnitOutlined />}
        >
          <Link to={config.routes.trustedSchemaRegistry}>
            Trusted Schema Registry
          </Link>
        </MenuAntd.Item>
        <MenuAntd.Item
          key={config.routes.trustedPoliciesRegistry}
          icon={<CarryOutOutlined />}
        >
          <Link to={config.routes.trustedPoliciesRegistry}>
            Trusted Policies Registry
          </Link>
        </MenuAntd.Item>
      </MenuAntd>
    </Sider>
  );
}
