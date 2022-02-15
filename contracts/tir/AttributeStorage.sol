// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

// solhint-disable-next-line indent
abstract contract AttributeStorage {
    struct AttributeMetadata {
        // For each Attribute version hash, this is an object that stores
        // the DID of his owner and the hash of the first version.
        string did; // DID of the attribute owner.
        bytes32 attributeId; // Unique attribute ID (hash of the first attribute version)
    }
    struct AttributeDetails {
        // For a particular Entity and a specific Attribute id, this is
        // the ordered list of the hashes of each attribute version.
        bytes32[] revisionHashes;
    }
    struct Entity {
        //This is the Entity Object is in charge of storing all the attributes
        // information of each type of entity (domain owner, Domain Administrator,
        // Domain Issuer) identified by their DID and managed by the registry.
        // [Attr1firstHash, Attr2firstHash, Attr3firstHash ...]
        bytes32[] attributes;
        // For a particular Entity and a specific Attribute id, this is a collection of
        // all attribute version hashes and corresponding attribute JSON-LD value.
        mapping(bytes32 => bytes) revisions;
        // firstAttrHash ->  {versionHashes:[firstAttrHash, v2Hash, v3Hash ...],
        // versionData:Attr(n)v(n)Hash -> data}
        mapping(bytes32 => AttributeDetails) attributesStore;
    }
}
