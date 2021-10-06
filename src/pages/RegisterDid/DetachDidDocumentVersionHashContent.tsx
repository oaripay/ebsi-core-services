import { Col, Form, FormInstance, Row, Select } from "antd";
import React from "react";

type PropType = {
  form: FormInstance;
  versionHashes: string[];
};

export default function DetachDidDocumentVersionHashContent({
  form,
  versionHashes,
}: PropType) {
  if (!versionHashes.length) {
    return <></>;
  }
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        versionHash: "",
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item
            label="Version hash"
            name="versionHash"
            rules={[{ required: true }]}
          >
            <Select style={{ width: "100%" }} onChange={() => {}}>
              {versionHashes.map((versionHash: string, index: number) => {
                return (
                  <Select.Option
                    key={`${versionHash + index}`}
                    value={versionHash}
                  >
                    {versionHash}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
