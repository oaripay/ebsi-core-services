// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./TirDetailed.sol";
import "./IssuerDetailed.sol";
import "./TirPolicyDetailed.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";

/**
 * @title Trusted Issuers Registry Smart Contract
 *
 */
contract Tir is Initializable, TirDetailed, IssuerDetailed, TirPolicyDetailed {
    IPolicyRegistry public immutable policyRegistryContract;
    IDidRegistry public immutable didRegistryContract;

    constructor(address _tprAddress, address _didRegistryAddress) {
        policyRegistryContract = IPolicyRegistry(_tprAddress);
        didRegistryContract = IDidRegistry(_didRegistryAddress);
    }

    function initialize(uint256 _version) public initializer {
        TirDetailed.init(_version);
        // call setter
        setRegistryAddresses();
    }

    function setRegistryAddresses() public {
        Issuers storage ds = issuerStorage();

        ds.trustedPolicyRegistry = policyRegistryContract;
        ds.didRegistry = didRegistryContract;
    }
}
