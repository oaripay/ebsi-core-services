// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
import "./AttributeStorage.sol";

contract IssuerStorage is AttributeStorage {
  // The state variables we care about.
  bytes32 constant ISSUER_DIAMOND_STORAGE_POSITION = keccak256(
    "diamond.standard.tir.issuer.storage"
  );

  struct Issuers {
    string[] didStore; // list of all dids
    mapping(string => Entity) issuerStore; // DID -> [Issuer]
    mapping(bytes32 => AttributeMetadata) attributeMetadataStore; // Attr(n)v(n)Hash -> DID, firsthash  // a convenient way to retrieve a did and firsthash based on any attributeHash
  }

  // Creates and returns the storage pointer to the struct.
  function issuerStorage() internal pure returns (Issuers storage ms) {
    bytes32 position = ISSUER_DIAMOND_STORAGE_POSITION;
    assembly {
      ms.slot := position
    }
  }
}
