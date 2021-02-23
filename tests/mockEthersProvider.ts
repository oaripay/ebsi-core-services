import { ethers } from "ethers";
import { of } from "rxjs";

export default (): ethers.providers.JsonRpcProvider => {
  return ({
    getLogs: jest.fn(
      (): Promise<ethers.providers.Log[]> => {
        return of([
          {
            blockNumber: 646595,
            blockHash:
              "0x0e3912e112f9b1fbf496c375dbdcb7b5cbc139c39fed4c55f36dc6ed9cda02cb",
            transactionIndex: 0,
            removed: false,
            address: "0x21b38942aA9BC992482627f63814Ffa06DA7e500",
            data: "0x",
            topics: [
              "0x4bb4fe37a0e5e6287dc03d734ce5412bd6aecea7b409a029b4d7776ad90889e3",
              "0x9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f0f5200a",
              "0x0000000000000000000000000ef9c28263fd26be9d597925be02085bb1236b59",
              "0x000000000000000000000000000000000000000000000000000000000005f1e6",
            ],
            transactionHash:
              "0xb0fec9e4ba9958f3f42b78ec7076d6aa6991c98b31f7efcce5e1d9faa07b3e11",
            logIndex: 0,
          },
        ]).toPromise();
      }
    ),
    getBlock: jest.fn(
      (): Promise<ethers.providers.Block> => {
        return of({
          transactions: [
            "0xb0fec9e4ba9958f3f42b78ec7076d6aa6991c98b31f7efcce5e1d9faa07b3e11",
          ],
          hash:
            "0x0e3912e112f9b1fbf496c375dbdcb7b5cbc139c39fed4c55f36dc6ed9cda02cb",
          parentHash:
            "0xea7f7b0f4837d711b984f781e9fa0b431a2d7fa32ffe0f1dbd9dc4cd44d8fbb8",
          number: 646595,
          timestamp: 1586171386,
          nonce: "0x0000000000000000",
          difficulty: 1,
          gasLimit: null,
          gasUsed: null,
          miner: "0xF618d305b3cC3E7181937Da874Ad07d6f2D67C10",
          extraData:
            "0xf90148a00000000000000000000000000000000000000000000000000000000000000000f854947df7b640d9c4c24f563a7d5702499521255fc165949d2375d1b45b54603a365e23e0197c0a7a8150c894da316adfafdfe6c627e9429176954f25e4a2fb8e94f618d305b3cc3e7181937da874ad07d6f2d67c10808400000000f8c9b8413b665a210deaed333a950d405a707eb0ed3a3a360e3793f562a6d3a7ecdae5953c1ca24885d5ea6bdb83260638086bb1f461bf29876bc84ddb7b9e690a42c4ba00b8417b3a99443be97120341f8b6718982a6bcd50ceffe45b5f50551acb8166bfbc3e52a5d5f282da91fbdf7f399626fb7dce8ff82c56cec3150b987493cffd9f334c01b841e4df2373c29f26133a97da019a84d3c979e948347bf7e85a8688db67b4aadf214d10e50b99a1171a8abb05745e5928a6daa9f6a3809d830253049aa2ebad830800",
        }).toPromise();
      }
    ),
  } as unknown) as ethers.providers.JsonRpcProvider;
};
