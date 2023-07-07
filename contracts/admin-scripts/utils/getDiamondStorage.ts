export function getDiamondStorage(contractName) {
  switch (contractName) {
    case "PolicyRegistry":
    case "PolicyRegistryV2": {
      return "diamond.standard.policy.registry.storage";
    }
    case "DidRegistry":
    case "DidRegistryV2":
    case "DidRegistryV3": {
      return "diamond.standard.did.registry.storage";
    }
    case "Tar":
    case "TarV3": {
      return "diamond.standard.tar.storage";
    }
    case "Tir":
    case "TirV3": {
      return "diamond.standard.tir.storage";
    }
    case "SchemaSCRegistry":
    case "SchemaSCRegistryV2": {
      return "diamond.standard.tsr.storage";
    }
    case "Timestamp":
    case "TimestampV2": {
      return "diamond.standard.timestamp.storage";
    }
    default:
      throw new Error(`no diamond storage defined for ${contractName}`);
  }
}

export default getDiamondStorage;
