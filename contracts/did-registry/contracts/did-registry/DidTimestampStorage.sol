// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./HashAlgoStorage.sol";

contract DidTimestampStorage is HashAlgoStorage {
    bytes32 public constant REGISTRY_DID_TIMESTAMP_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.did.registry.did.timestamp.storage");

    struct Hash {
        uint256 algorithm;
        bytes value;
    }

    struct DidTimestamp {
        Hash hash;
        address timestampedBy;
        uint256 blockNumber;
        bytes data;
    }

    struct DidTimestamps {
        uint256 _version;
        mapping(bytes32 => DidTimestamp) didTimestampsStore;
        // a list of all ts ids. TS ID is computed as sha2-256(hashValue)
        bytes32[] didTimestampIdsList;
    }

    // Creates and returns the storage pointer to the struct.
    function didTimestampStorage()
        internal
        pure
        returns (DidTimestamps storage ms)
    {
        bytes32 position = REGISTRY_DID_TIMESTAMP_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
