// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
// solhint-disable-next-line max-line-length
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./TimestampDetailed.sol";
import "./RecordDetailed.sol";
import "./HashAlgoDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
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
