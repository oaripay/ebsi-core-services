// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./TarDetailed.sol";
import "./TarPolicyDetailed.sol";
import "./AuthorizationDetailed.sol";
import "./RevocationDetailed.sol";
import "./AppDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tar is
    Initializable,
    TarDetailed,
    AppDetailed,
    TarPolicyDetailed,
    RevocationDetailed,
    AuthorizationDetailed
{
    IPolicyRegistry public immutable policyRegistryContract;
    IDidRegistry public immutable didRegistryContract;

    constructor(address _tprAddress, address _didRegistryAddress) {
        policyRegistryContract = IPolicyRegistry(_tprAddress);
        didRegistryContract = IDidRegistry(_didRegistryAddress);
    }

    function initialize(uint256 _version) public initializer {
        TarDetailed.init(_version);
        // call setter
        setRegistryAddresses();
    }

    function setRegistryAddresses() public {
        AppStoreLib.Applications storage ts = appStorage();
        ts.trustedPolicyRegistry = policyRegistryContract;
        ts.didRegistry = didRegistryContract;
    }
}
