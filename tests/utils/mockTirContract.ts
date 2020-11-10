import crypto from "crypto";
import { ethers } from "ethers";
import { TrustedIssuersRegistryContract } from "../../src/shared/types/trusted-issuers-registry.interface";
import { compute1BasedPaginationLinks } from "../../src/shared/utils/pagination.utils";

interface Entity {
  attributes: string[];
  attributesStore: {
    [y: string]: {
      revisionHashes: string[];
    };
  };
  revisions: {
    [hash: string]: string;
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

type PaginationResult<T> = {
  items: T[];
  total: number;
  prev: number;
  next: number;
};

function pagination<T>(
  data: T[],
  inputPage: number,
  pageSize: number
): PaginationResult<T> {
  const total: number = data.length;

  const { prevPage, nextPage } = compute1BasedPaginationLinks(
    total,
    inputPage,
    pageSize
  );
  const items: T[] = data.slice(
    (inputPage - 1) * pageSize,
    inputPage * pageSize
  );

  return {
    items,
    total,
    prev: prevPage,
    next: nextPage,
  };
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
const didStore = Object.keys(dummyDataWithoutContext);
const issuerStore: {
  [x: string]: Entity;
} = {};
const attributeMetadataStore: {
  [y: string]: {
    did: string;
    attributeId: string;
  };
} = {};

didStore.forEach((did) => {
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

didStore.forEach((did) => {
  const attributes = [];
  const attributesStore = {};
  const revisions = {};

  dummyData[did].forEach((attributeHistory) => {
    const { versions } = attributeHistory;
    let attributeId: string = null;
    const revisionHashes = [];

    versions.forEach((version, i) => {
      jsonlds.push(version);
      const buffer = Buffer.from(JSON.stringify(version), "utf8");
      const attrHash = ethers.utils.sha256(buffer);
      const attrData = `0x${buffer.toString("hex")}`;
      revisionHashes.push(attrHash);
      revisions[attrHash] = attrData;
      if (i === 0) attributeId = attrHash;
      attributeMetadataStore[attrHash] = { did, attributeId };
    });
    attributes.push(attributeId);
    attributesStore[attributeId] = { revisionHashes };
  });
  issuerStore[did] = { attributes, attributesStore, revisions };
});

export const encodePolicy = (val: string): string =>
  `0x${Buffer.from(val, "base64").toString("hex")}`;

// Simulate SC storage
export const policyStorage: {
  policyIdStore: string[];
  policyStore: Record<string, { revisionHashes: string[] }>;
  revisions: Record<string, string>;
} = {
  policyIdStore: [],
  policyStore: {},
  revisions: {},
};

// For test only
export const originalPolicies: Record<string, string> = {};

function storePolicy(policyId: string, policyData: string) {
  const policyHash = ethers.utils.sha256(Buffer.from(policyData, "utf-8"));

  if (!policyStorage.policyStore[policyId]) {
    policyStorage.policyStore[policyId] = {
      revisionHashes: [],
    };
  }

  const p = policyStorage.policyStore[policyId] as { revisionHashes: string[] };

  if (!p.revisionHashes.includes(policyId)) {
    p.revisionHashes.push(policyHash);
  }

  policyStorage.revisions[policyHash] = encodePolicy(policyData);

  // Not in the SC
  originalPolicies[policyHash] = policyData;

  if (!policyStorage.policyIdStore.includes(policyId)) {
    policyStorage.policyIdStore.push(policyId);
  }
}

// Create 25 policies
Array(25)
  .fill("")
  .forEach(() => {
    const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;

    // For every policy, create 12 revisions
    Array(12)
      .fill("")
      .forEach(() => {
        const json = {
          // any object here
          any: "Any attribute here",
          type: "credential",
          data: crypto.randomBytes(16).toString("hex"),
        };
        const data = Buffer.from(JSON.stringify(json));
        const policyData = data.toString("base64");

        storePolicy(policyId, policyData);
      });
  });

/*
  policyStorage now looks like this:

    {
      policyIdStore: [
        'policy-test-2b15b8e618cb3e01d8a3a6c04862b3bf',
        'policy-test-a9ccfa3df617dd2d10aae40dec918564'
      ],
      policyStore: {
        'policy-test-2b15b8e618cb3e01d8a3a6c04862b3bf': { revisionHashes: [
          '0xdf4afc483b634c9688b6b9640496526355b1c381562dcf480f96c9a0547b8675',
          '0x80a275dfbf64f6c62aa608cb296ada40f9d54c58835830fdf3b714ae5fce9fc1',
          '0x731da60ca2ef0d0a9bdf6398b6bcbb55257070e3d9ef39a6c2d694fdd6536179'
        ] },
        'policy-test-a9ccfa3df617dd2d10aae40dec918564': { revisionHashes: [
          '0x11bfa202033d702fcc1fa9c1ad15bc4dc95775cea85a973c77b33f28739d8f0e',
          '0x5d5dec35bb2c6e8d491c11d0872def4184b8d4f158eab040f1cb51c552502eb4',
          '0x0d3093dbeb6686a642f89191ff1e53bfbde42f386f25c6210346dde22581f358'
        ] }
      },
      revisions: {
        '0xdf4afc483b634c9688b6b9640496526355b1c381562dcf480f96c9a0547b8675': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223934613461353331353933393538653464643563633930353963313331633030227d',
        '0x80a275dfbf64f6c62aa608cb296ada40f9d54c58835830fdf3b714ae5fce9fc1': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226135313639373062663131383263323262393335656439336139313262646336227d',
        '0x731da60ca2ef0d0a9bdf6398b6bcbb55257070e3d9ef39a6c2d694fdd6536179': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223631316163633366356538306265636638336235396230656639653939373962227d',
        '0x11bfa202033d702fcc1fa9c1ad15bc4dc95775cea85a973c77b33f28739d8f0e': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226530303736656164646630323261373436646634356562383335396233623634227d',
        '0x5d5dec35bb2c6e8d491c11d0872def4184b8d4f158eab040f1cb51c552502eb4': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223161366536643330363362646361376161316265613232353365653364303932227d',
        '0x0d3093dbeb6686a642f89191ff1e53bfbde42f386f25c6210346dde22581f358': '0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226666393336376135393930323238636634386561643139386330646430356665227d'
      }
    }
*/

function validateHash(hash: string) {
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("hex data is odd-length");
  }
}

const mockedTirContract = jest.fn<TrustedIssuersRegistryContract, unknown[]>(
  () => ({
    getAdministrators: jest.fn(async (inputPage, pageSize) => {
      await Promise.resolve(); // make function async

      if (pageSize > 50) {
        throw new Error("PageSize should not be greater than 50");
      }

      if (pageSize <= 0) {
        throw new Error("PageSize should be greater than 0");
      }

      if (inputPage <= 0) {
        throw new Error("Page must be > 0");
      }

      const { items, total, prev, next } = pagination(
        didStore,
        inputPage,
        pageSize
      );

      return {
        items,
        total: ethers.BigNumber.from(total),
        howMany: ethers.BigNumber.from(pageSize),
        prev: ethers.BigNumber.from(prev),
        next: ethers.BigNumber.from(next),
      };
    }),

    getAdministrator: jest.fn(async (did: string) => {
      await Promise.resolve(); // make function async
      const administrator = issuerStore[did];

      if (!administrator) {
        throw new Error(
          `call revert exception (method="getAdministrator(string)", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.7)`
        );
      }

      return administrator.attributes;
    }),

    getAdministratorAttributeByHash: jest.fn(async (attrHash: string) => {
      await Promise.resolve(); // make function async

      validateHash(attrHash);

      if (!attributeMetadataStore[attrHash]) {
        throw new Error(
          `call revert exception (method="getAdministratorAttributeByHash(bytes32)", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.7)`
        );
      }

      const { did } = attributeMetadataStore[attrHash];
      const attribData = issuerStore[did].revisions[attrHash];
      return { did, attribData };
    }),

    getAdministratorAttributeRevisions: jest.fn(
      async (attrHash: string, page: number, pageSize: number) => {
        await Promise.resolve(); // make function async

        if (pageSize > 50) {
          throw new Error("PageSize should not be greater than 50");
        }

        if (pageSize <= 0) {
          throw new Error("PageSize should be greater than 0");
        }

        if (page <= 0) {
          throw new Error("Page must be > 0");
        }

        validateHash(attrHash);
        const attrInfo = attributeMetadataStore[attrHash];

        if (!attributeMetadataStore[attrHash]) {
          return {
            items: [],
            total: ethers.BigNumber.from(0),
            howMany: ethers.BigNumber.from(pageSize),
            prev: ethers.BigNumber.from(1),
            next: ethers.BigNumber.from(1),
          };
        }

        const administrator = issuerStore[attrInfo.did];

        const { items, total, prev, next } = pagination(
          administrator.attributesStore[attrInfo.attributeId].revisionHashes,
          page,
          pageSize
        );

        return {
          items,
          total: ethers.BigNumber.from(total),
          howMany: ethers.BigNumber.from(pageSize),
          prev: ethers.BigNumber.from(prev),
          next: ethers.BigNumber.from(next),
        };
      }
    ),

    getIssuers: jest.fn(async (inputPage, pageSize) => {
      await Promise.resolve(); // make function async

      if (pageSize > 50) {
        throw new Error("PageSize should not be greater than 50");
      }

      if (pageSize <= 0) {
        throw new Error("PageSize should be greater than 0");
      }

      if (inputPage <= 0) {
        throw new Error("Page must be > 0");
      }

      const { items, total, prev, next } = pagination(
        didStore,
        inputPage,
        pageSize
      );

      return {
        items,
        total: ethers.BigNumber.from(total),
        howMany: ethers.BigNumber.from(pageSize),
        prev: ethers.BigNumber.from(prev),
        next: ethers.BigNumber.from(next),
      };
    }),

    getIssuer: jest.fn(async (did: string) => {
      await Promise.resolve(); // make function async

      const issuer = issuerStore[did];

      if (!issuer) {
        throw new Error(
          `call revert exception (method="getIssuer(string)", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.7)`
        );
      }

      return issuer.attributes;
    }),

    getIssuerAttributeByHash: jest.fn(async (attrHash: string) => {
      await Promise.resolve(); // make function async

      validateHash(attrHash);

      if (!attributeMetadataStore[attrHash]) {
        throw new Error(
          `call revert exception (method="getIssuerAttributeByHash(bytes32)", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.7)`
        );
      }

      const { did } = attributeMetadataStore[attrHash];
      const attribData = issuerStore[did].revisions[attrHash];

      return { did, attribData };
    }),

    getIssuerAttributeRevisions: jest.fn(
      async (attrHash: string, page: number, pageSize: number) => {
        await Promise.resolve(); // make function async

        if (pageSize > 50) {
          throw new Error("PageSize should not be greater than 50");
        }

        if (pageSize <= 0) {
          throw new Error("PageSize should be greater than 0");
        }

        if (page <= 0) {
          throw new Error("Page must be > 0");
        }

        validateHash(attrHash);

        const attrInfo = attributeMetadataStore[attrHash];

        if (!attributeMetadataStore[attrHash]) {
          return {
            items: [],
            total: ethers.BigNumber.from(0),
            howMany: ethers.BigNumber.from(pageSize),
            prev: ethers.BigNumber.from(1),
            next: ethers.BigNumber.from(1),
          };
        }

        const issuer = issuerStore[attrInfo.did];

        const { items, total, prev, next } = pagination(
          issuer.attributesStore[attrInfo.attributeId].revisionHashes,
          page,
          pageSize
        );

        return {
          items,
          total: ethers.BigNumber.from(total),
          howMany: ethers.BigNumber.from(pageSize),
          prev: ethers.BigNumber.from(prev),
          next: ethers.BigNumber.from(next),
        };
      }
    ),

    getPolicies: jest.fn(async (inputPage, pageSize) => {
      await Promise.resolve(); // make function async

      if (pageSize > 50) {
        throw new Error("PageSize should not be greater than 50");
      }

      if (pageSize <= 0) {
        throw new Error("PageSize should be greater than 0");
      }

      if (inputPage <= 0) {
        throw new Error("Page must be > 0");
      }

      const { items, total, prev, next } = pagination(
        policyStorage.policyIdStore,
        inputPage,
        pageSize
      );

      return {
        items,
        total: ethers.BigNumber.from(total),
        howMany: ethers.BigNumber.from(pageSize),
        prev: ethers.BigNumber.from(prev),
        next: ethers.BigNumber.from(next),
      };
    }),

    getPolicy: jest.fn(
      async (
        policyId: string
      ): ReturnType<TrustedIssuersRegistryContract["getPolicy"]> => {
        await Promise.resolve(); // make function async

        if (
          !policyStorage.policyIdStore.includes(policyId) ||
          !policyStorage.policyStore[policyId]
        ) {
          throw new Error(
            `call revert exception (method="getPolicy(string)", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.7)`
          );
        }

        const policyRevisionHashes =
          policyStorage.policyStore[policyId].revisionHashes;

        if (policyRevisionHashes.length <= 0) {
          throw new Error(
            `call revert exception (method="getPolicy(string)", errorSignature=null, errorArgs=[null], reason="policy does not exist", code=CALL_EXCEPTION, version=abi/5.0.7)`
          );
        }

        const lastHash = policyRevisionHashes.slice(-1)[0];

        return [policyStorage.revisions[lastHash], lastHash];
      }
    ),

    getPolicyByHash: jest.fn(async (revisionHash: string) => {
      await Promise.resolve(); // make function async

      if (!policyStorage.revisions[revisionHash]) {
        throw new Error(
          `call revert exception (method="getPolicyByHash(bytes32)", errorSignature=null, errorArgs=[null], reason="policy data does not exist", code=CALL_EXCEPTION, version=abi/5.0.7)`
        );
      }

      return policyStorage.revisions[revisionHash];
    }),

    getPolicyRevisions: jest.fn(
      async (
        policyId: string,
        page: number,
        pageSize: number
      ): ReturnType<TrustedIssuersRegistryContract["getPolicyRevisions"]> => {
        await Promise.resolve(); // make function async

        if (pageSize > 50) {
          throw new Error("PageSize should not be greater than 50");
        }

        if (pageSize <= 0) {
          throw new Error("PageSize should be greater than 0");
        }

        if (
          !policyStorage.policyIdStore.includes(policyId) ||
          !policyStorage.policyStore[policyId]
        ) {
          throw new Error(
            `call revert exception (method="getPolicyRevisions(string,uint256,uint256)", errorSignature=null, errorArgs=[null], reason="policyId does not exist", code=CALL_EXCEPTION, version=abi/5.0.7)`
          );
        }

        const { items, total, prev, next } = pagination(
          policyStorage.policyStore[policyId].revisionHashes,
          page,
          pageSize
        );

        return {
          items,
          total: ethers.BigNumber.from(total),
          howMany: ethers.BigNumber.from(pageSize),
          prev: ethers.BigNumber.from(prev),
          next: ethers.BigNumber.from(next),
        };
      }
    ),
  })
);

export function mockTirContract(): ethers.Contract {
  return ({
    connect: mockedTirContract,
  } as unknown) as ethers.Contract;
}
