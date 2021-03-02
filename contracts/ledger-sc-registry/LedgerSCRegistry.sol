// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./LedgerSCStorage.sol";
import "./LedgerDetailed.sol";
import "./SmartContractDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract LedgerSCRegistry is
    LedgerSCStorage,
    LedgerDetailed,
    SmartContractDetailed,
    Initializable
{
    function initialize(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 _version) internal initializer {
        TSC storage ts = LedgerSCStorage.tscStorage();
        ts.version = _version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        TSC storage ts = LedgerSCStorage.tscStorage();
        return ts.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        TSC storage ts = LedgerSCStorage.tscStorage();
        ts.version = _version;
    }
}
