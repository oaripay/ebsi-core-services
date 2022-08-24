import React, { ReactElement } from "react";
import { Button, Collapse, Space, Table, Tag, Tooltip } from "antd";
import { EditOutlined, MinusOutlined } from "@ant-design/icons";
import { PAGE_SIZE } from "../../TrustedIssuersRegistry/constants";
import {
  InsertNewPolicyValueType,
  Operation,
  OperationType,
  PolicyCondition,
  TypeOfValue,
} from "../types";
import NewEditPolicyForm, {
  InitialValuesNewEditPolicy,
} from "../modal/NewEditPolicyForm";
import usePolicies from "../usePolicies";
import { useTrustedPoliciesContext } from "../Policies.context";

type PropType = {
  isShowEditNewPolicyModal: boolean;
  hideShowEditNewPolicyModal: () => void;
  editPolicy: (values: InsertNewPolicyValueType) => void;
  showEditModal: (values: InitialValuesNewEditPolicy) => void;
};

const { Panel } = Collapse;

export default function TrustedPoliciesTable({
  isShowEditNewPolicyModal,
  hideShowEditNewPolicyModal,
  editPolicy,
  showEditModal,
}: PropType): ReactElement {
  const { activatePolicy, deactivatePolicy, deletePolicyCondition } =
    usePolicies();
  const { policies, page, setPage, totalItems, editNewPolicyForm } =
    useTrustedPoliciesContext();

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      index: "id",
    },
    {
      title: "Policy name",
      dataIndex: "policyName",
      index: "policyName",
    },
    {
      title: "Description",
      dataIndex: "description",
      index: "description",
    },
    {
      title: "Operation type",
      dataIndex: "opType",
      index: "opType",
      render: (opType: number) => {
        return OperationType[opType];
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      index: "status",
      render: (status: number) => {
        return status ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        );
      },
    },
    {
      title: "Policy conditions",
      render: (data: { policyConditions: PolicyCondition[]; id: number }) => {
        const { policyConditions } = data;
        if (!policyConditions.length) {
          return "";
        }
        return (
          <Collapse>
            {policyConditions.map((condition, index: number) => {
              return (
                <Panel
                  header={condition.attributeName}
                  key={`${condition.attributeName}${
                    condition.name
                  }${Math.random()}`}
                >
                  <Space direction="vertical">
                    <h3 className="m-b-0">Attribute name</h3>
                    {condition.attributeName}
                    <h3 className="m-b-0">Attribute value</h3>
                    {condition.value}
                    <h3 className="m-b-0">Attribute op</h3>
                    {Operation[condition.attributeOperation]}
                    <h3 className="m-b-0">Attribute type</h3>
                    {TypeOfValue[condition.typeOfValue]}
                    <Button
                      danger
                      onClick={() => {
                        deletePolicyCondition(data.id, index);
                      }}
                    >
                      <MinusOutlined />
                      Delete condition
                    </Button>
                  </Space>
                </Panel>
              );
            })}
          </Collapse>
        );
      },
    },
    {
      title: "Actions",
      render: (values: InitialValuesNewEditPolicy) => {
        return (
          <Space direction="vertical">
            <Button
              type="primary"
              disabled={!values.status}
              onClick={() => {
                showEditModal({
                  ...values,
                  id: values.id,
                });
              }}
            >
              <Tooltip title="Edit policy">
                Edit Policy <EditOutlined />
              </Tooltip>
            </Button>
            <Button
              disabled={values.status}
              onClick={() => {
                activatePolicy(values.id);
              }}
            >
              Activate policy
            </Button>
            <Button
              disabled={!values.status}
              onClick={() => deactivatePolicy(values.id)}
            >
              Deactivate policy
            </Button>
          </Space>
        );
      },
    },
  ];
  return (
    <>
      <NewEditPolicyForm
        show={isShowEditNewPolicyModal}
        form={editNewPolicyForm}
        hideModal={hideShowEditNewPolicyModal}
        submit={editPolicy}
        isEdit
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={policies}
        pagination={{
          onChange: (pageNr: number) => {
            setPage(pageNr);
          },
          showSizeChanger: false,
          pageSize: PAGE_SIZE,
          current: page,
          total: totalItems,
        }}
      />
    </>
  );
}
