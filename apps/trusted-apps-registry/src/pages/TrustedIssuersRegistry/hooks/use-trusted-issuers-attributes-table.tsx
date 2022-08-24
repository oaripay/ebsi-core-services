import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { PAGE_SIZE } from "../constants";
import { PaginatedResponseType } from "../../../shared/PaginatedResponseType";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { TrustedIssuerAttributeType } from "../types/TrustedIssuerAttributeType";
import { getReversedValue } from "../../../helpers/pagination";

export default function useTrustedIssuersAttributesTable() {
  const { trustedIssuersContract } = useEthersHook();
  const [dataSource, setDataSource] = useState<TrustedIssuerAttributeType[]>(
    []
  );
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const getTotal = useCallback(
    async (attr: string) => {
      if (!trustedIssuersContract) {
        return 0;
      }
      const issuerData = await trustedIssuersContract.getIssuer(attr);
      if (!issuerData.length) {
        return 0;
      }
      return trustedIssuersContract
        .getIssuerAttributeRevisions(issuerData[0], 1, 1)
        .then(async (result: PaginatedResponseType) => {
          return result.total.toNumber();
        })
        .catch(() => 0);
    },
    [trustedIssuersContract]
  );

  const initTotal = useCallback(
    (attr: string) => {
      getTotal(attr).then((nr: number) => setTotal(nr));
    },
    [getTotal]
  );

  const loadAttributesWithRevision = useCallback(
    async (issuer: string) => {
      if (!trustedIssuersContract || total === 0) {
        return;
      }
      setTableLoading(true);

      let attributes: string[];
      try {
        attributes = await trustedIssuersContract.getIssuer(issuer);
      } catch (ex) {
        attributes = [];
      }

      const nrOfItems = await getTotal(issuer);

      const revisionsPromises = attributes.map((attr: string) => {
        return trustedIssuersContract
          .getIssuerAttributeRevisions(
            attr,
            getReversedValue(page, PAGE_SIZE, nrOfItems),
            PAGE_SIZE
          )
          .then(async (result: PaginatedResponseType) => {
            const awaitResult = await Promise.all(
              result.items.map((resultItem: string) => {
                return trustedIssuersContract.getIssuerAttributeByHash(
                  resultItem
                );
              })
            );
            return awaitResult.map((item: { attribData: string }) =>
              ethers.utils.toUtf8String(item.attribData)
            );
          });
      });
      const revisions = await Promise.all(revisionsPromises);

      const source: TrustedIssuerAttributeType[] = [];

      for (let i = 0; i < attributes.length; i += 1) {
        source.push({
          attributeData: attributes[i],
          revisions: revisions[i],
        });
      }

      setTableLoading(false);
      setDataSource(source);
    },
    [trustedIssuersContract, total, getTotal, page]
  );

  return {
    loadAttributesWithRevision,
    dataSource,
    tableLoading,
    setPage,
    page,
    initTotal,
    total,
  };
}
