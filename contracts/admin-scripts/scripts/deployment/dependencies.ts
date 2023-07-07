interface NetworkConfig {
  tprV1Address?: string;
  tprV2Address?: string;
  didV1Address?: string;
  didV2Address?: string;
  didV3Address?: string;
}

interface Dependencies {
  [chainId: number]: NetworkConfig;
}

export const dependencies: Dependencies = {
  6176: {},
  6175: {
    // Test Env
    tprV1Address: "0x17a340418937A38b3Cb62FdA42241eB0722868A6", // TPR API v2
    tprV2Address: "0x3d5edA0b5183e245bA9713B58834525EDfE46E90", // TPR API v3
    didV1Address: "0x15582f47140ff4bd74843583a1e3111032fb91c8", // DID API v3
    didV2Address: "0x823BBc0ceE3dE3B61AcfA0CEedb951AB9a013F05", // DID API v4
    didV3Address: "0x26E603f6FdCfC007c7bdC5be5f2c91D2a64a32E7", // DID API v5
  },
  1337: {
    tprV1Address: "0x331fC724f2e88269DFC96ddA52119752999EB25C",
    didV1Address: "0x331fC724f2e88269DFC96ddA52119752999EB25C", // DID API v3
  },
  6178: {
    // Conformance Env
    tprV1Address: "0x3591e30eaea83343ed69A077D059821c5099154A",
    didV1Address: "0x36cf4f85c6d7d40B243314E4FA665bE626E59Ba5", // DID API v3
    didV2Address: "0x4Fa9Dbee2E7CF24737348D5249Db7F94fA45f099", // DID API v4
  },
  6179: {
    // Pilot Env
    tprV1Address: "0x3591e30eaea83343ed69A077D059821c5099154A",
    didV1Address: "0xD55bDf1407E57D55C92BdB67088ECdA554b76B45", // DID API v3
    didV2Address: "0x755DEd5d5e81282F0BE85EDaE8e6852814bAC3fa", // DID API v4
  },
};

export default dependencies;
