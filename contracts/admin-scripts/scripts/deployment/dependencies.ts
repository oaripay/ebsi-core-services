interface NetworkConfig {
  tprAddress?: string;
  didAddress?: string;
  didV4Address?: string;
}

interface Dependencies {
  [chainId: number]: NetworkConfig;
}

export const dependencies: Dependencies = {
  6176: {},
  1337: {
    tprAddress: "0x331fC724f2e88269DFC96ddA52119752999EB25C",
    didAddress: "0x331fC724f2e88269DFC96ddA52119752999EB25C",
  },
  6178: {
    tprAddress: "0x3591e30eaea83343ed69A077D059821c5099154A",
    didAddress: "0x36cf4f85c6d7d40B243314E4FA665bE626E59Ba5",
  },
  6179: {
    tprAddress: "0x3591e30eaea83343ed69A077D059821c5099154A",
    didAddress: "0xD55bDf1407E57D55C92BdB67088ECdA554b76B45",
  },
};

export default dependencies;
