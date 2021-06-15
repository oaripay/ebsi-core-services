// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

contract HashAlgoStorage {
    // The state variables we care about.
    bytes32 public constant TS_HASHALGO_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.timestamp.hashAlgo.storage");
    enum Status {undefined, active, revoked}
    struct HashAlgoInfo {
        uint256 outputLength;
        string ianaName;
        string oid;
        Status status;
        string multiHash;
    }

    struct Algos {
        mapping(uint256 => string) id;
        uint256 numberOfAlgorithms;
    }
    struct HashAlgos {
        // id of the hash algo =>  HashAlgo
        mapping(uint256 => HashAlgoInfo) infoStore;
        // list of revoked application id
        Algos hashAlgorithms;
    }

    // Creates and returns the storage pointer to the struct.
    function hashAlgoStorage() internal pure returns (HashAlgos storage ms) {
        bytes32 position = TS_HASHALGO_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
