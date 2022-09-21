// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../trusted-policies-registry-ethereum-sc/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract DidDocumentStorage {
    // The state variables we care about.
    bytes32 public constant DID_DOCUMENT_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.diddocument.storage");

    struct RollArgs {
        string did;
        string vMethodId;
        bytes publicKey;
        bool isSecp256k1;
        uint256 notBefore;
        uint256 notAfter;
        string oldVMethodId;
        uint256 duration;
    }

    struct VMethod {
        bytes publicKey;
        bool isSecp256k1;
        bool revoked;
    }

    struct VRelationship {
        string name;
        string vMethodId;
        uint256 notBefore;
        uint256 notAfter;
    }

    struct DidDocument {
        string baseDocument;
        string[] controllers;
        mapping(string => VMethod) vMethods;
        VRelationship[] vRelationships;
        VRelationship[] capabilityInvocations;
    }

    struct DidDocuments {
        // a collection of DID Documents
        mapping(string => DidDocument) didList;
        string[] dids;
        IPolicyRegistry trustedPolicyRegistry;
    }

    // Creates and returns the storage pointer to the struct.
    function didDocumentStorage()
        internal
        pure
        returns (DidDocuments storage ms)
    {
        bytes32 position = DID_DOCUMENT_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
