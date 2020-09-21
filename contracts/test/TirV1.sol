// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../tir/Tir.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract TirV1 is Tir {
    function init2(uint256 newVersion) public {
        Tir storage ds = tirStorage();
        ds._version = newVersion;
    }

    function getDidLastAttribute(string memory did)
        public
        view
        returns (bytes32)
    {
        IssuerModel storage ds = issuerStorage();
        return
            ds.issuers[did].attributes[ds.issuers[did].attributes.length - 1];
    }
}
