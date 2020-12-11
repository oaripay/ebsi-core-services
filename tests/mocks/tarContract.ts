import { ethers } from "ethers";
import { AsyncReturnType } from "../../src/shared/types/async-return-type";
import { Tar } from "../../src/contracts/Tar";
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
const adminStore: {
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
  adminStore[did] = { attributes, attributesStore, revisions };
});

function validateHash(hash: string) {
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("hex data is odd-length");
  }
}

export const mockedTarContract = jest.fn<Partial<Tar>, unknown[]>(() => ({
  getAdministrators: jest.fn(async (inputPage: number, pageSize: number) => {
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
    } as AsyncReturnType<Tar["getAdministrators"]>;
  }),

  getAdministrator: jest.fn(async (did: string) => {
    await Promise.resolve(); // make function async
    const administrator = adminStore[did];

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
    const attribData = adminStore[did].revisions[attrHash];
    return { did, attribData } as AsyncReturnType<
      Tar["getAdministratorAttributeByHash"]
    >;
  }),
}));
