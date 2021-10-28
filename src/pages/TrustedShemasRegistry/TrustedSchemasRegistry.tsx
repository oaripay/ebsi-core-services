import React, { ReactElement, useCallback, useMemo } from "react";
import { PageHeader, Space } from "antd";
import { useParams } from "react-router-dom";
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
        <PageHeader
          className="site-page-header p-0"
          title="Trusted Schemas Registry"
          subTitle={subtitle}
        />
        <Component />
      </Space>
    </ModalProvider>
  );
}
