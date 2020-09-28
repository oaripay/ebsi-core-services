// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./TirV1.sol";
import "./IssuerStorageV1.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract TirV2 is TirV1, IssuerStorageV1 {
    function getIssuerAttributesFirstHash2(string memory did)
        public
        view
        returns (bytes32[] memory)
    {
        IssuerModel2 storage ds = issuerStorage2();
        return ds.issuers[did].attributes;
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
