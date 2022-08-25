import React, { ReactElement } from "react";
import { Col, Form, Input, Modal, Row, Spin } from "antd";
import useUpdateTrustedIssuer from "./hooks/use-update-trusted-issuer";

export default function AddAttributeHashModal({
  showModal,
  setModal,
  did,
  loadTableData,
}: {
  did: string;
  showModal: boolean;
  setModal: (options: { show: boolean; did: string }) => void;
  loadTableData: () => void;
}): ReactElement {
  const { submitting, submit, form, setHasFieldsErrors, hasFieldsErrors } =
    useUpdateTrustedIssuer();

  return (
    <Modal
      title="Add attribute hash"
      okText="Add"
      visible={showModal}
      onCancel={() => {
        setModal({
          show: false,
          did: "",
        });
        form.resetFields(["attribute"]);
      }}
      okButtonProps={{
        loading: submitting,
        disabled: hasFieldsErrors,
      }}
      onOk={async () => {
        await submit(did);
        setModal({
          show: false,
          did: "",
        });
        form.resetFields(["attribute"]);

        loadTableData();
      }}
    >
      <Spin spinning={submitting}>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            attribute: "",
          }}
        >
          <Row>
            <Col span={24}>
              <Form.Item
                label="Attribute"
                name="attribute"
                rules={[
                  {
                    required: true,
                    message: "Attribute is required!",
                  },
                  ({ getFieldValue }) => ({
                    validator() {
                      try {
                        JSON.parse(getFieldValue("attribute"));
                        setHasFieldsErrors(false);
                        return Promise.resolve();
                      } catch (ex) {
                        setHasFieldsErrors(true);
                        return Promise.reject(
                          new Error("Not a valid attribute format!")
                        );
                      }
                    },
                  }),
                ]}
              >
                <Input placeholder="{ <attribute>: <value> }" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Spin>
    </Modal>
  );
}
