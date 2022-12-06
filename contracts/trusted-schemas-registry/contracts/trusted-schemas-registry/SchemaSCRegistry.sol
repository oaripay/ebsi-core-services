// SPDX-License-Identifier: EUPL V1.2

pragma solidity 0.8.12;
// solhint-disable-next-line max-line-length
import "./SchemaSCStorage.sol";
import "./SchemaDetailed.sol";
import "./SchemaPolicyDetailed.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract SchemaSCRegistry is
    SchemaSCStorage,
    SchemaDetailed,
    SchemaPolicyDetailed,
    Initializable
{
    IPolicyRegistry public immutable policyRegistryContract;

    constructor(address _tprAddress) {
        policyRegistryContract = IPolicyRegistry(_tprAddress);
    }

    function initialize(uint256 _version) public initializer {
        _onInitialize(_version);
        // call setter for setTrustedPoliciesRegistryAddress
        setTrustedPoliciesRegistryAddress();
    }

    function setTrustedPoliciesRegistryAddress() public {
        Schemas storage ss = schemaStorage();

        ss.trustedPolicyRegistry = policyRegistryContract;
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        TSC storage ts = SchemaSCStorage.tscStorage();
        ts.version = _version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        TSC storage ts = SchemaSCStorage.tscStorage();
        return ts.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        TSC storage ts = SchemaSCStorage.tscStorage();
        ts.version = _version;
    }
}
