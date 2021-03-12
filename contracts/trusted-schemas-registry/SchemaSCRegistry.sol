// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./SchemaSCStorage.sol";
import "./SchemaDetailed.sol";
import "./AdministratorDetailed.sol";
import "./PolicyDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract SchemaSCRegistry is
    SchemaSCStorage,
    SchemaDetailed,
    AdministratorDetailed,
    PolicyDetailed,
    Initializable
{
    function initialize(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 _version) internal initializer {
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
