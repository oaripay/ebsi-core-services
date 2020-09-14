pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../tir/Issuer.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Issuer_V1 is Issuer {
    function init2(uint256 newVersion) public {
        IssuerModel storage ds = issuerStorage();
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
