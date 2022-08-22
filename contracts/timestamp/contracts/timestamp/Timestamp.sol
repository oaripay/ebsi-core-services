// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";
import "./TimestampDetailed.sol";
import "./RecordDetailed.sol";
import "./HashAlgoDetailed.sol";

/**
 * @title Timestamp Smart Contract
 * @dev Initializable -> Indicates the contract will be initialized by an external function
 * @dev RecordDetailed -> Indicates that the contract is storing all detailed records.
 * @dev TimestampDetailed -> Indicates that the contract timestamps are being stored with all its details.
 * @dev HashAlgoDetailed -> Indicates that the contract is allowed to store and manipulate hashes.
 */
contract Timestamp is
    Initializable,
    RecordDetailed,
    TimestampDetailed,
    HashAlgoDetailed
{
    function initialize(uint256 version) public initializer {
        TimestampDetailed.init(version);
    }
}
/* TODO insert those in the deployment script
enum Algo {
        Unregistered,
        SHA256,
        SHA25612,
        SHA256120,
        SHA25696,
        SHA25664,
        SHA25632,
        SHA384,
        SHA512,
        SHA3224,
        SHA3256,
        SHA3384,
        SHA35152
    } */
