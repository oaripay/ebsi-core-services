// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./TimestampDetailed.sol";
import "./RecordDetailed.sol";
import "./HashAlgoDetailed.sol";
import "@ebsiint-sc/trusted-policies-registry-v3/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

/**
 * @title Timestamp Smart Contract
 * @dev Initializable -> Indicates the contract will be initialized by an external function
 * @dev RecordDetailed -> Indicates that the contract is storing all detailed records.
 * @dev TimestampDetailed -> Indicates that the contract timestamps are being stored with all its details.
 * @dev HashAlgoDetailed -> Indicates that the contract is allowed to store and manipulate hashes.
 */
contract Timestamp is
    RecordDetailed,
    TimestampDetailed,
    HashAlgoDetailed,
    UUPSUpgradeable,
    AccessControlUpgradeable
{
    IPolicyRegistry public policyRegistryContract;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    event NewVersion(uint256);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _upgraderAddress,
        address _tprAddress
    ) public initializer {
        __AccessControl_init();
        _grantRole(UPGRADER_ROLE, _upgraderAddress);
        _setRoleAdmin(UPGRADER_ROLE, UPGRADER_ROLE);
        policyRegistryContract = IPolicyRegistry(_tprAddress);
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() external view returns (uint256) {
        Timestamps storage ts = timestampStorage();
        return ts.version;
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    function _onInitialize() internal onlyInitializing {}

    function setVersion(uint256 _version) internal {
        Timestamps storage ts = TimestampStorage.timestampStorage();
        ts.version = _version;
        emit NewVersion(_version);
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

    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "not upgrader");
    }
}
