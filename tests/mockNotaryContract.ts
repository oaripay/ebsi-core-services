import { ethers } from "ethers";
import { of } from "rxjs";

const logs = [
  {
    blockNumber: 8571109,
    blockHash:
      "0xb64b674e917e91bca51dac51595de5dd8ee8c1dccd51f92221dbe6bee5c7d8ce",
    transactionIndex: 0,
    removed: false,
    address: "0x21b38942aA9BC992482627f63814Ffa06DA7e500",
    data: "0x",
    topics: [
      "0x4bb4fe37a0e5e6287dc03d734ce5412bd6aecea7b409a029b4d7776ad90889e3",
      "0x5265d8a717cf7533fbe7ccbc45315558884aac57cb5321194e2aafa4c732d5bf",
      "0x000000000000000000000000f9d96b9ff6bc59a6fe8b56e9c50ac311e931c375",
      "0x000000000000000000000000000000000000000000000000000000000082c7f8",
    ],
    transactionHash:
      "0x628f8a9aad9d94c38e29787c36837fe8d513c335ec2d06482a3e26dc1a78785a",
    logIndex: 0,
    event: "REC",
    eventSignature: "REC(bytes32,address,uint256)",
    args: [
      "0x5265d8a717cf7533fbe7ccbc45315558884aac57cb5321194e2aafa4c732d5bf",
      "0xf9d96B9Ff6BC59A6fE8B56e9c50Ac311e931c375",
      { type: "BigNumber", hex: "0x82c7f8" },
    ],
  },
];

export default (): ethers.Contract => {
  return {
    lastBlockREC: jest.fn((): Promise<number> => {
      return of(8571109).toPromise();
    }),
    record: jest.fn((): string => {
      return "0xde020FB144Bc3239C1446EB9dE73706A47D5929b";
    }),
    queryFilter: jest.fn((): Promise<ethers.providers.Log[]> => {
      return of(logs).toPromise();
    }),
    filters: {
      REC: jest.fn((): ethers.EventFilter => {
        return {
          address: "0x21b38942aA9BC992482627f63814Ffa06DA7e500",
          topics: [
            "0x4bb4fe37a0e5e6287dc03d734ce5412bd6aecea7b409a029b4d7776ad90889e3",
            "0x9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f0f5200a",
            "0x0000000000000000000000000ef9c28263fd26be9d597925be02085bb1236b59",
            "0x000000000000000000000000000000000000000000000000000000000005f1e6",
          ],
        };
      }),
    },
  } as unknown as ethers.Contract;
};
