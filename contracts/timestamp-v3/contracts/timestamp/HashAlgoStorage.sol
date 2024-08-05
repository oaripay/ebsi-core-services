// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

contract HashAlgoStorage {
    enum Status {
        undefined,
        active,
        revoked
    }

    struct HashAlgoInfo {
        uint256 outputLength;
        string ianaName;
        string oid;
        Status status;
        string multiHash;
    }

    struct HashAlgos {
        // id of the hash algo =>  HashAlgo
        mapping(uint256 => HashAlgoInfo) hashAlgorithms;
        mapping(string => bool) ianaNameDefined;
        uint256 numberOfAlgorithms;
    }

    bytes32 public constant TS_HASHALGO_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.timestamp.hashAlgo.storage");

    uint256[50] private __gap;

    // Creates and returns the storage pointer to the struct.
    function hashAlgoStorage() internal pure returns (HashAlgos storage ms) {
        bytes32 position = TS_HASHALGO_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
