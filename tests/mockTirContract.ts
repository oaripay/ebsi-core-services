import { ethers } from "ethers";
import * as _testData from "./testData.json";

interface DbIssuer {
  attributes: string[];
  attributesDetail: {
    [y: string]: {
      versionHashes: string[];
      versionData: {
        [hash: string]: string;
      };
    };
  };
}
interface DbTir {
  dids: string[];
  issuers: {
    [x: string]: DbIssuer;
  };
  attributesInfos: {
    [y: string]: {
      did: string;
      attrId: string;
    };
  };
}

function pagination(data: unknown[], inputPage: number, howMany: number) {
  if (howMany > 50) throw new Error("PageSize should not be greater than 50");
  if (howMany <= 0) throw new Error("PageSize should be greater than 0");
  const total = data.length;
  const pageSize = howMany < total ? howMany : total;
  const lastPage = parseInt(Number((total - 1) / pageSize).toString(), 10);
  let page = inputPage;
  if (page > lastPage) page = lastPage;
  else if (page < 0) page = 0;

  const prev = page === 0 ? 0 : page - 1;
  const next = page >= lastPage ? lastPage : page + 1;

  const cursor = pageSize * page;
  const length = page < lastPage ? pageSize : total - cursor;

  const items = [];
  for (let i = cursor; i < cursor + length; i += 1) items.push(data[i]);

  return {
    items,
    total: ethers.BigNumber.from(total),
    pageSize: ethers.BigNumber.from(pageSize),
    prev: ethers.BigNumber.from(prev),
    next: ethers.BigNumber.from(next),
  };
}

export default (): ethers.Contract => {
  return ({
    connect() {
      const testData: DbTir = _testData;
      return {
        getIssuers: jest.fn((inputPage, howMany) => {
          return pagination(testData.dids, inputPage, howMany);
        }),
        getIssuer: jest.fn((did: string) => {
          const issuer = testData.issuers[did];
          if (issuer) return issuer.attributes;
          return [];
        }),
        getIssuerAttributebyHash: jest.fn((attrHash: string) => {
          const { did, attrId } = testData.attributesInfos[attrHash];
          const attribData =
            testData.issuers[did].attributesDetail[attrId].versionData[
              attrHash
            ];
          return { did, attribData };
        }),
      };
    },
  } as unknown) as ethers.Contract;
};
