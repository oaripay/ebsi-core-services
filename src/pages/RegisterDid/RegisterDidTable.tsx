import React from "react";
import { Col, Row, Table } from "antd";
import useDidTable from "./use-did-table";

type PropType = {
  didRecord: any;
};

export default function RegisterDidTable({ didRecord }: PropType) {
  const { columns, dataSource } = useDidTable({ didRecord });
  return (
    <Row>
      <Col span={12}>
        <Table columns={columns} dataSource={dataSource} />
      </Col>
    </Row>
  );
}
