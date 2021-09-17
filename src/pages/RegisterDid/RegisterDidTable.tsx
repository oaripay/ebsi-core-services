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
      <Col span={20}>
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{
            x: 1600,
          }}
        />
      </Col>
    </Row>
  );
}
