// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "../../bootstrap-ethereum-sc/contracts/utils/pausable/Pausable.sol";
import "./TirDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tir is Initializable, TirDetailed, Pausable {
    function initialize(uint256 version, address[] calldata pausers)
        public
        initializer
    {
        TirDetailed.initialize(version);

        Pausable.initialize(address(this));
        _removePauser(address(this));

        for (uint256 i = 0; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }
}
