import { ethers } from "ethers";
import { pagination } from "../../src/shared/utils";

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

interface AttributeHistoryObject {
  attribute?: unknown;
  versions: {
    [y: string]: unknown;
  }[];
}

interface DummyDataObject {
  [x: string]: AttributeHistoryObject[];
}

const context = {
  name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
  description: "http://tir-api-test.org/description",
};

const dummyDataWithoutContext: DummyDataObject = {
  "did:ebsi:0x00": [
    {
      versions: [
        {
          name: "alice",
        },
      ],
    },
  ],
  "did:ebsi:0x01": [
    {
      versions: [
        {
          name: "bob",
        },
      ],
    },
  ],
  "did:ebsi:0x02": [
    {
      versions: [
        {
          name: "carl",
        },
      ],
    },
  ],
  "did:ebsi:0x03": [
    {
      versions: [
        {
          name: "dany",
        },
      ],
    },
  ],
  "did:ebsi:0x04": [
    {
      versions: [
        {
          name: "jacob",
        },
      ],
    },
  ],
  "did:ebsi:0x05": [
    {
      versions: [
        {
          name: "smith",
        },
      ],
    },
  ],
  "did:ebsi:0x06": [
    {
      versions: [
        {
          name: "leo",
        },
      ],
    },
  ],
  "did:ebsi:0x07": [
    {
      versions: [
        {
          name: "chris",
        },
      ],
    },
  ],
  "did:ebsi:0x08": [
    {
      versions: [
        {
          name: "vivi",
        },
      ],
    },
  ],
  "did:ebsi:0x09": [
    {
      versions: [
        {
          name: "albert",
        },
      ],
    },
  ],
  "did:ebsi:0x10": [
    {
      versions: [
        {
          name: "lisa",
        },
      ],
    },
  ],
  "did:ebsi:0x11": [
    {
      versions: [
        {
          name: "mary",
        },
      ],
    },
  ],
  "did:ebsi:0x12": [
    {
      versions: [
        {
          name: "nathalie",
        },
        {
          name: "nathalie2",
        },
        {
          name: "nathalie3",
        },
        {
          name: "nathalie4",
        },
        {
          name: "nathalie5",
        },
        {
          name: "nathalie6",
        },
        {
          name: "nathalie7",
        },
        {
          name: "nathalie8",
        },
        {
          name: "nathalie9",
        },
        {
          name: "nathalie10",
        },
        {
          name: "nathalie11",
        },
        {
          name: "nathalie12",
        },
        {
          name: "nathalie13",
        },
        {
          name: "nathalie14",
        },
        {
          name: "nathalie15",
        },
        {
          name: "nathalie16",
        },
        {
          name: "nathalie17",
        },
        {
          name: "nathalie18",
        },
        {
          name: "nathalie19",
        },
        {
          name: "nathalie20",
        },
      ],
    },
  ],
  "did:ebsi:0x13": [
    {
      versions: [
        {
          name: "giny",
        },
      ],
    },
  ],
  "did:ebsi:0x14": [
    {
      versions: [
        {
          name: "carol",
        },
      ],
    },
  ],
  "did:ebsi:0x15": [
    {
      versions: [
        {
          name: "clob",
        },
      ],
    },
  ],
  "did:ebsi:0x16": [
    {
      versions: [
        {
          name: "lina",
        },
      ],
    },
  ],
  "did:ebsi:0x17": [
    {
      versions: [
        {
          name: "boby",
        },
      ],
    },
  ],
  "did:ebsi:0x18": [
    {
      versions: [
        {
          name: "jane",
        },
      ],
    },
  ],
  "did:ebsi:0x61dc3a5d45d81179406312ad3d7412d2eed65e61": [
    {
      versions: [
        {
          name: "admin",
        },
      ],
    },
  ],
};

export const jsonlds = [];
export const dummyData: DummyDataObject = {};
const dids = Object.keys(dummyDataWithoutContext);
const issuers: {
  [x: string]: DbIssuer;
} = {};
const attributesInfos: {
  [y: string]: {
    did: string;
    attrId: string;
  };
} = {};

dids.forEach((did) => {
  const didAttributes = dummyDataWithoutContext[did].map((attributeHistory) => {
    const versions = attributeHistory.versions.map((version) => {
      return {
        "@context": context,
        ...version,
      };
    });
    const lastVersion = versions.length ? versions[versions.length - 1] : null;
    return {
      attribute: lastVersion,
      versions,
    };
  });
  dummyData[did] = didAttributes;
});

dids.forEach((did) => {
  const attributes = [];
  const attributesDetail = {};
  dummyData[did].forEach((attributeHistory) => {
    const { versions } = attributeHistory;
    let attrId: string = null;
    const versionData = {};
    const versionHashes = [];

    versions.forEach((version, i) => {
      jsonlds.push(version);
      const buffer = Buffer.from(JSON.stringify(version), "utf8");
      const attrHash = ethers.utils.keccak256(buffer);
      const attrData = `0x${buffer.toString("hex")}`;
      versionHashes.push(attrHash);
      versionData[attrHash] = attrData;
      if (i === 0) attrId = attrHash;
      attributesInfos[attrHash] = { did, attrId };
    });
    attributes.push(attrId);
    attributesDetail[attrId] = { versionData, versionHashes };
  });
  issuers[did] = { attributes, attributesDetail };
});

function validateHash(hash: string) {
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("hex data is odd-length");
  }
}

export function mockTirContract(): ethers.Contract {
  return ({
    connect() {
      return {
        getAdministrators: jest.fn((inputPage, pageSize) => {
          if (pageSize > 50)
            throw new Error("PageSize should not be greater than 50");
          if (pageSize <= 0)
            throw new Error("PageSize should be greater than 0");
          const { items, total, prev, next } = pagination(
            dids,
            inputPage,
            pageSize
          );
          return {
            items,
            total: ethers.BigNumber.from(total),
            pageSize: ethers.BigNumber.from(pageSize),
            prev: ethers.BigNumber.from(prev),
            next: ethers.BigNumber.from(next),
          };
        }),
        getAdministrator: jest.fn((did: string) => {
          const administrator = issuers[did];
          if (administrator) return administrator.attributes;
          return [];
        }),
        getAdministratorAttributebyHash: jest.fn((attrHash: string) => {
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
        getAdministratorAttributeHistory: jest.fn((attrHash: string) => {
          validateHash(attrHash);
          const attrInfo = attributesInfos[attrHash];
          if (!attributesInfos[attrHash]) return [];
          const administrator = issuers[attrInfo.did];
          return administrator.attributesDetail[attrInfo.attrId].versionHashes;
        }),
        getIssuers: jest.fn((inputPage, pageSize) => {
          if (pageSize > 50)
            throw new Error("PageSize should not be greater than 50");
          if (pageSize <= 0)
            throw new Error("PageSize should be greater than 0");
          const { items, total, prev, next } = pagination(
            dids,
            inputPage,
            pageSize
          );
          return {
            items,
            total: ethers.BigNumber.from(total),
            pageSize: ethers.BigNumber.from(pageSize),
            prev: ethers.BigNumber.from(prev),
            next: ethers.BigNumber.from(next),
          };
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
