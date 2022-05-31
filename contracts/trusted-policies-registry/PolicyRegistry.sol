// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.9;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "./PolicyListManagement.sol";
import "./UserAttributesManagement.sol";
import "./PolicyEngine.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract PolicyRegistry is
    PolicyStorage,
    Initializable,
    PolicyListManagement,
    UserAttributesManagement,
    PolicyEngine
{
    function initialize(uint256 _version) public initializer {
        _onInitialize(_version);
    }

    function _onInitialize(uint256 _version) internal initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        PolicyContractStorage storage ps = PolicyStorage.policyStorage();
        ps.version = _version;
    }

    /**
     * @dev Returns the version of the PolicyStorage SC
     */
    function version() public view returns (uint256) {
        PolicyContractStorage storage ps = PolicyStorage.policyStorage();
        return ps.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        PolicyContractStorage storage ps = PolicyStorage.policyStorage();
        ps.version = _version;
    }

    function admin() external returns (address) {
        DiamondStorage storage ms = diamondStorage();
        return ms.proxyAdmin;
    }

    function implementation() external returns (address) {
        DiamondStorage storage ms = diamondStorage();
        return ms.implementation;
    }

    uint256[50] private ______gap;
}
