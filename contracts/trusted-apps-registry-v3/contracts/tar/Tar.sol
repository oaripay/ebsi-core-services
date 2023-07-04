// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./TarDetailed.sol";
import "./AuthorizationDetailed.sol";
import "./RevocationDetailed.sol";
import "./AppDetailed.sol";

contract Tar is
    Initializable,
    TarDetailed,
    AppDetailed,
    RevocationDetailed,
    AuthorizationDetailed
{
    IPolicyRegistry public immutable policyRegistryContract;
    IDidRegistry public immutable didRegistryContract;

    constructor(address _tprAddress, address _didRegistryAddress) {
        require(
            _tprAddress != address(0) && _didRegistryAddress != address(0),
            "zero address"
        );
        policyRegistryContract = IPolicyRegistry(_tprAddress);
        didRegistryContract = IDidRegistry(_didRegistryAddress);
        _disableInitializers();
    }

    function initialize(uint256 _version) public initializer {
        TarDetailed.init(_version);
    }

    function getDidRegistry()
        internal
        view
        virtual
        override
        returns (IDidRegistry)
    {
        return didRegistryContract;
    }

    function getTrustedPolicyRegistry()
        internal
        view
        virtual
        override
        returns (IPolicyRegistry)
    {
        return policyRegistryContract;
    }
}
