pragma solidity ^0.7.0;

contract IssuerStorage {
  // The state variables we care about.
  bytes32 constant ISSUER_DIAMOND_STORAGE_POSITION = keccak256(
    "diamond.standard.issuer.storage"
  );

  struct AttributeDetail {
    bytes32[] versionHashes;
    mapping(bytes32 => bytes) versionData;
  }
  struct Issuer {
    bytes32[] attributes; // [Attr1firstHash, Attr2firstHash, Attr3firstHash ...]
    mapping(bytes32 => AttributeDetail) attributesDetail; // firstAttrHash ->  {versionHashes:[firstAttrHash, v2Hash, v3Hash ...], versionData:Attr(n)v(n)Hash -> data}
  }
  struct AttributeInfo {
    string did;
    bytes32 attrId; //firstHash of the attribute is used as an ID
  }

  struct IssuerModel {
    address _operator;
    uint256 _version;
    mapping(string => Issuer) issuers; // DID -> [Issuer]
    mapping(bytes32 => AttributeInfo) attributeInfos; // Attr(n)v(n)Hash -> DID, firsthash  // a convenient way to retrieve a did and firsthash based on any attributeHash
  }

  // Creates and returns the storage pointer to the struct.
  function issuerStorage() internal pure returns (IssuerModel storage ms) {
    bytes32 position = ISSUER_DIAMOND_STORAGE_POSITION;
    assembly {
      ms.slot := position
    }
  }
}
