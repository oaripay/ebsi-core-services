// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
import "./AttributeStorage.sol";

contract AdministratorStorage is AttributeStorage {
  // The state variables we care about.
  bytes32 constant TIR_ADMINISTRATOR_DIAMOND_STORAGE_POSITION = keccak256(
    "diamond.standard.tir.administrator.storage"
  );


  struct Administrator {
    bytes32[] attributes; // [Attr1firstHash, Attr2firstHash, Attr3firstHash ...]
    mapping(bytes32 => AttributeDetail) attributesDetail; // firstAttrHash ->  {versionHashes:[firstAttrHash, v2Hash, v3Hash ...], versionData:Attr(n)v(n)Hash -> data}
  }

  struct AdministratorModel {
    string[] dids; // list of all dids
    mapping(string => Administrator) administrators; // DID -> [Administrator]
    mapping(bytes32 => AttributeInfo) attributeInfos; // Attr(n)v(n)Hash -> DID, firsthash  // a convenient way to retrieve a did and firsthash based on any attributeHash
  }

  // Creates and returns the storage pointer to the struct.
  function administratorStorage() internal pure returns (AdministratorModel storage ms) {
    bytes32 position = TIR_ADMINISTRATOR_DIAMOND_STORAGE_POSITION;
    assembly {
      ms.slot := position
    }
  }
}
