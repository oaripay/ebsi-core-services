import { AutoComplete, Col, Input, Row, Select } from "antd";
import React, { useContext, useEffect, useMemo } from "react";
import Fuse from "fuse.js";

import { AppContext } from "./AppContext";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";

export function Search() {
  const appCtx = useContext(AppContext);
  const { totalItems, initTotalItems } = useRegistryContractHook();

  useEffect(() => {
    initTotalItems();
  }, []);

  const options = {
    shouldSort: true,
    threshold: 0,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    tokenize: true,
    matchAllTokens: true,
    findAllMatches: true,
    minMatchCharLength: 1,
    keys: ["name"],
  };

  const nrOfPages = useMemo(() => Math.ceil(totalItems / 50), [totalItems]);
  const pagesAsArray = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= nrOfPages; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [nrOfPages]);

  const fuse = useMemo(() => new Fuse(appCtx.tableDataSource, options), [
    appCtx.tableDataSource,
  ]);

  return (
    <Row>
      <Col>
        <AutoComplete
          dropdownClassName="certain-category-search-dropdown"
          dropdownMatchSelectWidth={500}
          style={{ width: 250 }}
          onSearch={(value) => {
            if (value !== "") {
              appCtx.setTableFilteredDataSource(
                fuse.search(value).map((data) => data.item)
              );
            } else {
              appCtx.setTableFilteredDataSource(appCtx.tableDataSource);
            }
          }}
        >
          <Input.Search size="large" placeholder="Search by name" />
        </AutoComplete>
      </Col>
      <Col style={{ marginLeft: 10 }}>
        <Select
          size="large"
          defaultValue={1}
          onChange={(pageSize: number) => {
            appCtx.setPage(pageSize);
          }}
        >
          {pagesAsArray.map((page: number) => (
            <Select.Option key={page} value={page}>
              Page {page}
            </Select.Option>
          ))}
        </Select>
      </Col>
    </Row>
  );
}
