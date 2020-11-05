// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./AppStorage.sol";
import "../utils/math/SafeMath.sol";

abstract contract AppDetailed is AppStorage {
    /* ====================== EVENTS ======================*/

    event ApplicationRegistered(uint256 indexed index, bytes32 indexed key);

    event AuthorizationAdded(uint256 indexed index1, uint256 indexed index2);

    event ApplicationUpdated(uint256 indexed index);

    event ApplicationDeleted(uint256 indexed index, bytes32 indexed key);

    event AuthorizationDeleted(uint256 indexed index1, uint256 indexed index2);

    uint256[50] private ______gap;
}
