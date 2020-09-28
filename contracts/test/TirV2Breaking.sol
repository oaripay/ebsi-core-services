// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./TirV1.sol";
import "./IssuerStorageV1Breaking.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract TirV2Breaking is TirV1, IssuerStorageV1Breaking {
    function getIssuerAttributesFirstHash2(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel2 storage ds = issuerStorage2();
        return ds.issuers[did].attributes;
    }

    function getIssuer2(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel2 storage ds = issuerStorage2();
        bytes32[] memory attributesFirstHash = ds.issuers[did].attributes;

        bytes32[] memory attributesLastHash = new bytes32[](
            attributesFirstHash.length
        );
        //list all the attributes
        for (uint256 index = 0; index < attributesFirstHash.length; index++) {
            // get all the versions for the current attribute
            bytes32[] memory versions = ds.issuers[did]
                .attributesDetail[attributesFirstHash[index]]
                .versionHashes;

            //get the last version hash for this attribute
            attributesLastHash[index] = versions[versions.length - 1];
        }
        return attributesLastHash;
    }

    function setMessage(string calldata message) public {
        IssuerModel2 storage ds = issuerStorage2();
        ds.message = message;
    }

    function getMessage() public view returns (string memory) {
        IssuerModel2 storage ds = issuerStorage2();
        return ds.message;
    }
}
