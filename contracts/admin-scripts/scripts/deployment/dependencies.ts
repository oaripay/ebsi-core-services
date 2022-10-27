interface NetworkConfig {
  tprAddress?: string;
  didAddress?: string;
}
interface Dependencies {
  [chainId: number]: NetworkConfig;
}

export const dependencies: Dependencies = {
  6176: {},
};
