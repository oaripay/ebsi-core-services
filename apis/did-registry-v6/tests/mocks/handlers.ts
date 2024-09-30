import { graphql, HttpResponse } from "msw";
import {
  did1,
  did2,
  did3,
  didDocumentData,
  didDocumentDataEmpty,
} from "../utils/constants.js";

export const dids = [
  {
    didDocument: {
      id: "did:ebsi:z23FGxCRmGZmei6uY3KCseXA",
      baseDocument:
        '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}',
      isSecp256k1: true,
      notAfter: "1723458018",
      notBefore: "1707906018",
      publicKey:
        "0x0423f9085a7751f0c93af38c054515904706d84bdcbb4e969dd2553d5939c30460452f4f43fef97622ac481fcf03125a08013bc1d39571e8131280014962247489",
      vMethodId: "QE0H4Xmd4djxt54_zn6LJgihPRRP0vruDJ1Alk5DDyw",
      controllers: [
        {
          id: "0x6469643a656273693a7a323346477843526d475a6d6569367559334b4373655841236469643a656273693a7a323346477843526d475a6d6569367559334b4373655841",
          controller: {
            id: "did:ebsi:z23FGxCRmGZmei6uY3KCseXA",
          },
          controlledDocument: {
            id: "did:ebsi:z23FGxCRmGZmei6uY3KCseXA",
          },
          status: "Active",
        },
      ],
      verificationRelationships: [
        {
          id: "0x679e9c826ac07b50df5ecd05e3875b650eacf3ef8022b094fe2cb70e1bab5dad00",
          name: "authentication",
          vMethodId:
            "0x5145304834586d6434646a787435345f7a6e364c4a6769685052525030767275444a31416c6b3544447977",
          notBefore: "1707906018",
          notAfter: "1723458018",
        },
        {
          id: "0x9ee2f06b16da48bba97a91ba36cb6f65e68df96d1ff75c7494852a4c450ebdbc00",
          name: "capabilityInvocation",
          vMethodId:
            "0x5145304834586d6434646a787435345f7a6e364c4a6769685052525030767275444a31416c6b3544447977",
          notBefore: "1707906018",
          notAfter: "1723458018",
        },
      ],
      verificationMethods: [],
    },
  },
  {
    didDocument: {
      id: "did:ebsi:z24iHa6jkHi8tdsyA3P5di58",
      baseDocument:
        '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}',
      isSecp256k1: true,
      notAfter: "1723562784",
      notBefore: "1708010784",
      publicKey:
        "0x0457e2b8568faba6a4e8cab031e68be6af8e5e48f3fe081f8530eabcd32b869bc369c316511b72b37c0320471673a1627716cfb6961647eb10fff33ea2e1ae7da6",
      vMethodId: "1P7GbNkBCPR_gGd2soa8zoHdHaRwOsLBI8wqYVwO__c",
      controllers: [
        {
          id: "0x6469643a656273693a7a3234694861366a6b486938746473794133503564693538236469643a656273693a7a3234694861366a6b486938746473794133503564693538",
          controller: {
            id: "did:ebsi:z24iHa6jkHi8tdsyA3P5di58",
          },
          controlledDocument: {
            id: "did:ebsi:z24iHa6jkHi8tdsyA3P5di58",
          },
          status: "Active",
        },
      ],
      verificationRelationships: [
        {
          id: "0x00ddf033f3cb0c3747a9e11b2d8bd57cd2f63eac4f7a38f76cd09786f02efa9300",
          name: "authentication",
          vMethodId:
            "0x31503747624e6b424350525f67476432736f61387a6f4864486152774f734c42493877715956774f5f5f63",
          notBefore: "1708010784",
          notAfter: "1723562784",
        },
        {
          id: "0x1e9650890b56c498684afb22ccc6c6d5254d895a6ca03cd36642091a56cad1cf00",
          name: "capabilityInvocation",
          vMethodId:
            "0x31503747624e6b424350525f67476432736f61387a6f4864486152774f734c42493877715956774f5f5f63",
          notBefore: "1708010784",
          notAfter: "1723562784",
        },
      ],
      verificationMethods: [],
    },
  },
  {
    didDocument: {
      id: "did:ebsi:zYmC7mSpST8pZgVqbpVaLYd",
      baseDocument:
        '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}',
      isSecp256k1: true,
      notAfter: "1723454357",
      notBefore: "1707902357",
      publicKey:
        "0x04accc0eb0fc826d9bb07ba6082e7f4f2bab75c3c6fe148571d217ac49d8ee933ea3e30559f651df60de6da74ef08167e8ac1cbd8e51a06b95d1aa08863b0d7a86",
      vMethodId: "MZ-vb0ochk_hFORtjLTy3leeDea72S9r0oj8GIej0CM",
      controllers: [
        {
          id: "0x6469643a656273693a7a596d43376d5370535438705a675671627056614c5964236469643a656273693a7a596d43376d5370535438705a675671627056614c5964",
          controller: {
            id: "did:ebsi:zYmC7mSpST8pZgVqbpVaLYd",
          },
          controlledDocument: {
            id: "did:ebsi:zYmC7mSpST8pZgVqbpVaLYd",
          },
          status: "Active",
        },
      ],
      verificationRelationships: [
        {
          id: "0x1a568d465fe949d45e839fedd51874b474df57a5586c540c6f8f56a5f1ba05cc00",
          name: "authentication",
          vMethodId:
            "0x4d5a2d7662306f63686b5f68464f52746a4c5479336c65654465613732533972306f6a384749656a30434d",
          notBefore: "1707902357",
          notAfter: "1723454357",
        },
        {
          id: "0x1c61d0f7245892c52c6364ebbcbbd18b5c5ac9c9c82f5036952eb3e1ab21e463",
          name: "capabilityInvocation",
          vMethodId:
            "0x4d5a2d7662306f63686b5f68464f52746a4c5479336c65654465613732533972306f6a384749656a30434d",
          notBefore: "1707902357",
          notAfter: "1723454357",
        },
      ],
      verificationMethods: [],
    },
  },
];

const didsData: unknown[] = [];
dids.forEach((did) => didsData.push(did.didDocument));

export const handlers = [
  graphql.query("GetDids", ({ variables }) => {
    const { skip, pagesize } = variables;

    if (skip === 0 && pagesize === 2) {
      return HttpResponse.json({
        data: {
          didDocuments: didsData.slice(0, 2),
        },
      });
    }

    if (skip === 2 && pagesize === 2) {
      return HttpResponse.json({
        data: {
          didDocuments: didsData.slice(0, 1),
        },
      });
    }

    if (skip === 4 && pagesize === 2) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    if (skip === 10 && pagesize === 10) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    if (skip > 20 && pagesize === 2) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    return HttpResponse.json({
      data: {
        didDocuments: didsData,
      },
    });
  }),
  graphql.query("GetDidsByController", ({ variables }) => {
    const { controller, skip, pagesize } = variables;

    if (controller === `${did2}#${did2}`) {
      return HttpResponse.json({
        data: {
          didDocuments: didsData.slice(0, 1),
        },
      });
    }

    if (controller === `${did2}`) {
      return HttpResponse.json({
        data: {
          didDocuments: didsData.slice(0, 1),
        },
      });
    }

    if (controller !== `${did1}`) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    if (skip === 10 && pagesize === 10) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    if (skip === 0 && pagesize === 50) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    return HttpResponse.json({
      data: {
        didDocuments: didsData.slice(0, 1),
      },
    });
  }),
  graphql.query("GetDidsByVerificationRelationship", ({ variables }) => {
    const { vMethodId, vRelationship, skip, pagesize } = variables;

    if (
      vMethodId !==
        "0x5145304834586d6434646a787435345f7a6e364c4a6769685052525030767275444a31416c6b3544447977" ||
      vRelationship !== "capabilityInvocation"
    ) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    if (skip === 10 && pagesize === 10) {
      return HttpResponse.json({
        data: {
          didDocuments: [],
        },
      });
    }

    return HttpResponse.json({
      data: {
        didDocuments: didsData.slice(0, 1),
      },
    });
  }),

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  graphql.query("GetDidDocumentByTimestamp", ({ variables }) => {
    const { did, timestamp } = variables;

    if (did === did2) {
      return HttpResponse.json({
        data: {
          didDocument: {
            ...didDocumentData.didDocument,
            verificationRelationships:
              didDocumentData.didDocument.verificationRelationships.filter(
                (v) => {
                  return v.notBefore <= timestamp && timestamp <= v.notAfter;
                },
              ),
          },
        },
      });
    }

    if (did === did1) {
      const didInvalidBaseDoc = JSON.parse(JSON.stringify(didDocumentData));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      didInvalidBaseDoc.didDocument.baseDocument = "bad base document";
      return HttpResponse.json({
        data: {
          ...didInvalidBaseDoc,
        },
      });
    }

    if (did === did3) {
      const didInvalidKey = JSON.parse(
        JSON.stringify(didDocumentData).replace(new RegExp(did2, "g"), did3),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      didInvalidKey.didDocument.verificationMethods[0].publicKey =
        "0x7b226372762";
      return HttpResponse.json({
        data: {
          ...didInvalidKey,
        },
      });
    }

    return HttpResponse.json({
      data: {
        ...didDocumentDataEmpty,
      },
    });
  }),
];
