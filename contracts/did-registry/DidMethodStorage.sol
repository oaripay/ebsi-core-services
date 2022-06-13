// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../trusted-policies-registry-ethereum-sc/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract DidMethodStorage {
    bytes32 public constant REGISTRY_DID_METHOD_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.did.registry.did.method.storage");
    enum MethodStatus {
        undefined,
        active,
        revoked,
        suspended
    }

    struct DidMethodInfoDetails {
        string methodName; // DID method name
        string ledgerName; // Name of ledger where DID Method is implemented.
        bytes[] methodSpec; // Array of bytes encoded serialized JSON-LD method spec
        bytes32[] methodSpecHash; // Array of bytes32 hashes (sha2-256) of the methodInfo element
        uint256 notBefore; // Date and time after the DID method can be used.
        uint256 notAfter; // Date and time at or after the DID method must be considered invalid.
        MethodStatus status; //Status of the did method.
    }

    struct Methods {
        // A collection of did method info. Key: sha2-256 of the DID Method name
        mapping(bytes32 => DidMethodInfoDetails) didMethodInfoStore;
        // A list of registered DID methods Ids. Each element is the sha2-256 of the DID method name
        bytes32[] didMethodIdList;
        // A list of registered DID methods name
        string[] didMethodNameList;
        IPolicyRegistry trustedPolicyRegistry;
    }

    // Creates and returns the storage pointer to the struct.
    function didMethodStorage() internal pure returns (Methods storage ms) {
        bytes32 position = REGISTRY_DID_METHOD_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
