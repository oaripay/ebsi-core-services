import { ethers } from "ethers";

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

const jsonData = [
  {
    name: "alice",
  },
  {
    name: "bob",
  },
  {
    name: "carl",
  },
  {
    name: "dany",
  },
  {
    name: "jacob",
  },
  {
    name: "smith",
  },
  {
    name: "leo",
  },
  {
    name: "chris",
  },
  {
    name: "vivi",
  },
  {
    name: "albert",
  },
  {
    name: "lisa",
  },
  {
    name: "mary",
  },
  {
    name: "nathalie",
  },
  {
    name: "giny",
  },
  {
    name: "carol",
  },
  {
    name: "clob",
  },
  {
    name: "lina",
  },
  {
    name: "bob",
  },
  {
    name: "jane",
  },
  {
    name: "admin",
    description: "this is an admin account with rights to create more issuers",
  },
];

const context = {
  name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
  description: "http://tir-api-test.org/description",
};

const dids = [
  "did:ebsi:0x00",
  "did:ebsi:0x01",
  "did:ebsi:0x02",
  "did:ebsi:0x03",
  "did:ebsi:0x04",
  "did:ebsi:0x05",
  "did:ebsi:0x06",
  "did:ebsi:0x07",
  "did:ebsi:0x08",
  "did:ebsi:0x09",
  "did:ebsi:0x10",
  "did:ebsi:0x11",
  "did:ebsi:0x12",
  "did:ebsi:0x13",
  "did:ebsi:0x14",
  "did:ebsi:0x15",
  "did:ebsi:0x16",
  "did:ebsi:0x17",
  "did:ebsi:0x18",
  "did:ebsi:0x61dc3a5d45d81179406312ad3d7412d2eed65e61",
];

export const jsonlds = jsonData.map((data) => ({
  "@context": context,
  ...data,
}));
const buffers = jsonlds.map((jsonld) =>
  Buffer.from(JSON.stringify(jsonld), "utf8")
);

const attrHashes = buffers.map((b) => ethers.utils.keccak256(b));
const attrData = buffers.map((b) => `0x${b.toString("hex")}`);

const issuers: {
  [x: string]: DbIssuer;
} = {};
const attributesInfos: {
  [y: string]: {
    did: string;
    attrId: string;
  };
} = {};
for (let i = 0; i < 20; i += 1) {
  const versionData = {};
  const attributesDetail = {};

  const attrId = attrHashes[i];
  const did = dids[i];

  versionData[attrId] = attrData[i];
  const attributes = [attrId];
  const versionHashes = [attrId];
  attributesDetail[attrId] = { versionData, versionHashes };

  issuers[did] = { attributes, attributesDetail };
  attributesInfos[attrId] = { did, attrId };
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

function validateHash(hash: string) {
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("hex data is odd-length");
  }
}

export function mockTirContract(): ethers.Contract {
  return ({
    connect() {
      return {
        getIssuers: jest.fn((inputPage, howMany) => {
          return pagination(dids, inputPage, howMany);
        }),
        getIssuer: jest.fn((did: string) => {
          const issuer = issuers[did];
          if (issuer) return issuer.attributes;
          return [];
        }),
        getIssuerAttributebyHash: jest.fn((attrHash: string) => {
          validateHash(attrHash);
          if (!attributesInfos[attrHash]) {
            return {
              did: "",
              attribData: "",
            };
          }
          const { did, attrId } = attributesInfos[attrHash];
          const attribData =
            issuers[did].attributesDetail[attrId].versionData[attrHash];
          return { did, attribData };
        }),
        getIssuerAttributeHistory: jest.fn((attrHash: string) => {
          validateHash(attrHash);
          const attrInfo = attributesInfos[attrHash];
          if (!attributesInfos[attrHash]) return [];
          const issuer = issuers[attrInfo.did];
          return issuer.attributesDetail[attrInfo.attrId].versionHashes;
        }),
      };
    },
  } as unknown) as ethers.Contract;
}
