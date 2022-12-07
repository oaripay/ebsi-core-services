// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/trusted-policies-registry/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract SmartContractStorage {
    // The state variables we care about.
    bytes32 public constant SC_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.sc.storage");

    struct SmartContracts {
        // An ordered list of registered smart contracts info ids
        bytes32[] scInfoIdList;
        // A smart contract name to smart contract info id map
        mapping(string => bytes32) scNameToSCInfoId;
        // A smart contract info revision id to smart contract info id map
        // key is SHA2-256 hash of the given smart contract info revision
        // value is the SC info Id
        mapping(bytes32 => bytes32) scInfoRevIdToSCInfoId;
        // A smart contract info id to smart contract info revisions id map
        mapping(bytes32 => bytes32[]) scStore;
        // A smart contract info revision id to smart contract info map
        mapping(bytes32 => bytes) scInfoStore;
        IPolicyRegistry trustedPolicyRegistry;
    }

    // Creates and returns the storage pointer to the struct.
    function smartContractStorage()
        internal
        pure
        returns (SmartContracts storage ms)
    {
        bytes32 position = SC_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
