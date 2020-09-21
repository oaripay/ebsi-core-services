// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;

abstract contract AttributeStorage {
    struct AttributeDetail {
        bytes32[] versionHashes;
        mapping(bytes32 => bytes) versionData;
    }

    struct AttributeInfo {
        string did;
        bytes32 attrId; //firstHash of the attribute is used as an ID
    }
}
