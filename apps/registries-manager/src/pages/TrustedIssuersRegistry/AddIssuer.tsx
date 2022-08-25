import React, { ReactElement } from "react";
import { Button, Col, Form, Input, Modal, Row, Spin } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import useAddTrustedIssuer from "./hooks/use-add-trusted-issuer";
import { isDid } from "../../helpers/did";

export default function AddIssuer(): ReactElement {
  const {
    form,
    submit,
    submitting,
    setShowModal,
    showModal,
    setHasFieldsErrors,
    hasFieldsErrors,
  } = useAddTrustedIssuer();

  return (
    <>
      <Button
        type="primary"
        onClick={() => {
          setShowModal(true);
        }}
      >
        <PlusOutlined />
        Insert new Issuer
      </Button>
      <Modal
        title="Insert Issuer"
        okText="Insert"
        visible={showModal}
        onCancel={() => {
          setShowModal(false);
          form.resetFields(["did"]);
        }}
        okButtonProps={{
          loading: submitting,
          disabled: hasFieldsErrors,
        }}
        onOk={async () => {
          await submit();
          setShowModal(false);
          form.resetFields(["did"]);
        }}
      >
        <Spin spinning={submitting}>
          <Form
            layout="vertical"
            form={form}
            initialValues={{
              did: "",
            }}
          >
            <Row>
              <Col span={24}>
                <Form.Item
                  label="DID"
                  name="did"
                  rules={[
                    {
                      required: true,
                      message: "Please input a DID!",
                    },
                    ({ getFieldValue }) => ({
                      validator() {
                        if (!isDid(getFieldValue("did"))) {
                          setHasFieldsErrors(true);
                          return Promise.reject(
                            new Error("Not a valid DID format")
                          );
                        }
                        setHasFieldsErrors(false);
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input placeholder="did:ebsi:....." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Spin>
      </Modal>
    </>
  );
}
