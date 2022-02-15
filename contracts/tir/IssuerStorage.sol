// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./AttributeStorage.sol";
import "../did-registry-ethereum-sc/contracts/did-registry/interfaces/IDidRegistry.sol";
// solhint-disable-next-line max-line-length
import "../did-registry-ethereum-sc/contracts/trusted-policies-registry-ethereum-sc/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract IssuerStorage is AttributeStorage {
    // The state variables we care about.
    bytes32 public constant ISSUER_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tir.issuer.storage");

    struct Issuers {
        string[] didStore; // list of all dids
        mapping(string => Entity) issuerStore; // DID -> [Issuer]
        // Attr(n)v(n)Hash -> DID, firsthash  // a convenient way to
        // retrieve a did and firsthash based on any attributeHash
        mapping(bytes32 => AttributeMetadata) attributeMetadataStore;
        IPolicyRegistry trustedPolicyRegistry;
        IDidRegistry didRegistry;
    }

    // Creates and returns the storage pointer to the struct.
    function issuerStorage() internal pure returns (Issuers storage ms) {
        bytes32 position = ISSUER_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
