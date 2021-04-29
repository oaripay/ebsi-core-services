import { Col, Input, Row } from "antd";
import React, { useCallback, useContext, useMemo } from "react";
import Fuse from "fuse.js";

import { AppContext } from "./AppContext";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";

export function Search() {
  const appCtx = useContext(AppContext);
  const { getAppByName, getApplications } = useRegistryContractHook();

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

  const search = useCallback(
    (word) => {
      getAppByName(word)
        .then((result: { applicationId: string }) => {
          if (result.applicationId) {
            appCtx.setTableLoading(true);
            getApplications([result.applicationId]).then((data: any) => {
              appCtx.setTableFilteredDataSource(data.tableData);
              getApplications(data.missingAppsFromTable).then(
                (missingApps: any) => {
                  appCtx.setMissingApps(missingApps.tableData);
                }
              );
            });
          } else {
            appCtx.setTableFilteredDataSource(
              fuse.search(word).map((data) => data.item)
            );
          }
        })
        .catch(() => {
          appCtx.setTableFilteredDataSource(
            fuse.search(word).map((data) => data.item)
          );
        });
    },
    [getApplications, appCtx.page, fuse]
  );

  return (
    <Row>
      <Col>
        <Input.Search
          size="large"
          placeholder="Search by name"
          onSearch={(value) => {
            const valueTrimmed = value.trim();
            if (valueTrimmed !== "") {
              search(valueTrimmed);
            } else {
              appCtx.setTableFilteredDataSource(appCtx.tableDataSource);
            }
          }}
        />
      </Col>
    </Row>
  );
}
