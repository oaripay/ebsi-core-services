// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract PolicyRegistry is PolicyStorage, Initializable {
    function initialize(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 _version) internal initializer {
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
}
