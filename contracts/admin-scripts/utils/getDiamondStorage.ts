export function getDiamondStorage(contractName: string) {
  switch (contractName) {
    case "DidRegistry":
    case "DidRegistryV2":
    case "DidRegistryV3":
    case "DidRegistryV4": {
      return "diamond.standard.did.registry.storage";
    }
    case "PolicyRegistry":
    case "PolicyRegistryV2":
    case "PolicyRegistryV3": {
      return "diamond.standard.policy.registry.storage";
    }
    case "SchemaSCRegistry":
    case "SchemaSCRegistryV2": {
      return "diamond.standard.tsr.storage";
    }
    case "Tar": {
      return "diamond.standard.tar.storage";
    }
    case "Timestamp":
    case "TimestampV2": {
      return "diamond.standard.timestamp.storage";
    }
    case "Tir":
    case "TirV3": {
      return "diamond.standard.tir.storage";
    }
    default: {
      throw new Error(`no diamond storage defined for ${contractName}`);
    }
  }
}

export default getDiamondStorage;
