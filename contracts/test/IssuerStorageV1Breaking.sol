// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
import "../tir/IssuerStorage.sol";

contract IssuerStorageV1Breaking is IssuerStorage {


  struct IssuerModel2 {
    string[] dids; // list of all dids
    string message;
    mapping(string => Issuer) issuers; // DID -> [Issuer]
    mapping(bytes32 => AttributeInfo) attributeInfos; // Attr(n)v(n)Hash -> DID, firsthash  // a convenient way to retrieve a did and firsthash based on any attributeHash

  }

  // Creates and returns the storage pointer to the struct.
  function issuerStorage2() internal pure returns (IssuerModel2 storage ms) {
    bytes32 position = ISSUER_DIAMOND_STORAGE_POSITION;
    assembly {
      ms.slot := position
    }
  }
}
