pragma solidity ^0.7.0;

import "./Anchor.sol";

/**
 * @title Anchor with an added functionality.
 *
 */
contract Anchor_V1 is Anchor {
    struct Role {
        bytes32[] bearer;
    }
    Role[] private _roles;

    function setRole(bytes32[] memory role) external {
        _roles.push(Role({bearer: role}));
    }

    function getRole(uint8 i)
        public
        view
        returns (bytes32[] memory winnerName_)
    {
        winnerName_ = _roles[i].bearer;
    }
}
