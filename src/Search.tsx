import { Col, Input, Row } from "antd";
import React, { useContext, useEffect, useState } from "react";

import { AppContext } from "./AppContext";

export function Search() {
  const appCtx = useContext(AppContext);

  const [value, setValue] = useState("");

  useEffect(() => {
    if (appCtx.clearInput) {
      setValue("");
      appCtx.setClearInput(false);
    }
  }, [appCtx.clearInput]);

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
