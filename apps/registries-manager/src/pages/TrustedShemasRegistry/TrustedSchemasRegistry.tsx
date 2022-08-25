import React, { ReactElement, useCallback, useMemo } from "react";
import { Card, Col, PageHeader, Row, Space } from "antd";
import { useParams } from "react-router-dom";
import Title from "antd/lib/typography/Title";
import { EyeOutlined } from "@ant-design/icons";
import TrustedSchemaTab from "./TrustedSchemasTab";
import { useVerifyNetworkEffectHook } from "../../hooks/use-verify-network-effect.hook";
import TrustedRevisionTab from "./TrustedRevisionTab";
import TrustedSchemasMetadataTab from "./TrustedSchemasMetadataTab";
import { ModalProvider } from "./Modal.context";

type ParamType = {
  schemaId?: string;
  revisionId?: string;
};

export default function TrustedSchemasRegistry(): ReactElement {
  useVerifyNetworkEffectHook();

  const params: ParamType = useParams();

  const Component = useCallback(() => {
    if (params?.schemaId) {
      return <TrustedRevisionTab />;
    }
    if (params?.revisionId) {
      return <TrustedSchemasMetadataTab />;
    }
    return <TrustedSchemaTab />;
  }, [params?.revisionId, params?.schemaId]);

  const subtitle = useMemo(() => {
    if (params?.schemaId) {
      return "Revisions";
    }
    if (params?.revisionId) {
      return "Metadata";
    }
    return "";
  }, [params?.revisionId, params?.schemaId]);

  return (
    <ModalProvider>
      <Space direction="vertical" className="content-container" size="middle">
        <Card title={<Title>Trusted Schema Registry</Title>}>
          <Row>
            <Col>
              <p>
                Trusted Schemas Registry (TSR) is an EBSI core service. It
                enables to:
              </p>
              <ul>
                <li>register a new schema</li>
                <li>update a registered schema</li>
                <li>read and validate registered schemas</li>
              </ul>
              <Row align="middle">
                <a
                  href="https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/EBSI+V2+-+Trusted+Schemas+Registry+API"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <EyeOutlined /> See more
                </a>
              </Row>
            </Col>
          </Row>
        </Card>
        <PageHeader className="site-page-header p-0" subTitle={subtitle} />

        <Component />
      </Space>
    </ModalProvider>
  );
}
