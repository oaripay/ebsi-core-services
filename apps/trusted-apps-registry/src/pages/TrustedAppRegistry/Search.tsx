import { Col, Input, Row } from "antd";
import React, { useEffect, useState } from "react";

import { useAppContext } from "../../AppContext";

export function Search() {
  const appCtx = useAppContext();

  const [value, setValue] = useState("");

  useEffect(() => {
    if (appCtx.clearInput) {
      setValue("");
      appCtx.setClearInput(false);
    }
  }, [appCtx, appCtx.clearInput]);

  return (
    <Row>
      <Col>
        <Input.Search
          size="large"
          placeholder="Search by name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onSearch={(searchValue) => {
            appCtx.setSearchedTerm(searchValue);
          }}
        />
      </Col>
    </Row>
  );
}
