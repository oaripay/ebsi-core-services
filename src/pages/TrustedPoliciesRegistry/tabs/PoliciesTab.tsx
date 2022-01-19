import React, { ReactElement, useState } from "react";
import { Button, Col, Input, Row, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import NewEditPolicyForm from "../modal/NewEditPolicyForm";
import TrustedPoliciesTable from "../tables/TrustedPoliciesTable";
import usePolicies from "../usePolicies";
import { useTrustedPoliciesContext } from "../Policies.context";
import useSearch from "../useSearch";

export default function PoliciesTab(): ReactElement {
  const {
    isShowInsertNewPolicyModal,
    isShowEditNewPolicyModal,
    showInsertNewPolicyModal,
    hideShowInsertNewPolicyModal,
    hideShowEditNewPolicyModal,
    insertPolicy,
    showEditNewPolicyModal,
    editPolicy,
  } = usePolicies();
  const { insertNewPolicyForm, loading } = useTrustedPoliciesContext();

  const { policies, setPolicies } = useTrustedPoliciesContext();
  const { search } = useSearch();

  const [initialPolicies] = useState(policies);

  return (
    <Space direction="vertical">
      <NewEditPolicyForm
        show={isShowInsertNewPolicyModal}
        form={insertNewPolicyForm}
        hideModal={hideShowInsertNewPolicyModal}
        submit={insertPolicy}
        isEdit={false}
      />
      <Row justify="space-between" align="middle">
        <Col span="7">
          <Input
            placeholder="Search policy by name or registry name"
            name="search-policy"
            type="text"
            id="search-policy"
            onChange={async (e) => {
              if (!e.target.value) {
                setPolicies(initialPolicies);
                return;
              }

              const ids = await search(e.target.value);
              setPolicies(
                initialPolicies.filter((policy) => ids.includes(policy.id))
              );
            }}
          />
        </Col>
        <Col>
          <Button
            type="primary"
            onClick={showInsertNewPolicyModal}
            disabled={loading}
          >
            <PlusOutlined /> Insert new Policy
          </Button>
        </Col>
      </Row>

      <TrustedPoliciesTable
        showEditModal={showEditNewPolicyModal}
        isShowEditNewPolicyModal={isShowEditNewPolicyModal}
        hideShowEditNewPolicyModal={hideShowEditNewPolicyModal}
        editPolicy={editPolicy}
      />
    </Space>
  );
}
