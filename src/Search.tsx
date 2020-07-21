import { AutoComplete, Input } from "antd";
import React, { useContext, useMemo } from "react";
import Fuse from "fuse.js";

import { AppContext } from "./AppContext";

export function Search() {
  const appCtx = useContext(AppContext);

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

  const fuse = useMemo(() => new Fuse(appCtx.tableDataSource, options), [
    appCtx.tableDataSource,
  ]);

  return (
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
  );
}
