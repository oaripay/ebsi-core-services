// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./TimestampLib.sol";
import "./HashAlgoLib.sol";

contract TimestampDetailed is Initializable, TimestampStorage {
    using TimestampLib for Timestamps;
    event TimestampedHashes(
        bytes32[] timestampIds,
        uint256[] hashAlgorithmIds,
        bytes[] hashValues,
        bytes[] timestampData
    );

    /**
     * @dev Sets the values for `operator`,   and `version`.
     */

    function init(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 version) internal initializer {
        Timestamps storage ts = TimestampStorage.timestampStorage();
        ts._version = version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        Timestamps storage ts = timestampStorage();
        return ts._version;
    }

    function setVersion(uint256 _version) public {
        Timestamps storage ts = timestampStorage();
        ts._version = _version;
    }

    /**
     * @dev  timestamps one or more hashes. Up to three hashes can be timestamped at a time.
     */
    function timestampHashes(
        uint256[] calldata hashAlgorithmIds,
        bytes[] calldata hashValues,
        bytes[] calldata timestampData
    ) external returns (bytes32[] memory timestampIds) {
        HashAlgos storage hs = hashAlgoStorage();
        Timestamps storage ts = timestampStorage();
        timestampIds = ts.timestampHashes(
            hs,
            hashAlgorithmIds,
            hashValues,
            timestampData
        );
        return timestampIds;
    }

    /**
     * @dev returns a paginated list of timestamp hashes. List of all timestamp ids is stored in the timestampIdsList
     */
    function getTimestamps(uint256 page, uint256 pageSize)
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Timestamps storage ts = timestampStorage();
        return ts.getTimestamps(page, pageSize);
    }

    /**
     * @dev returns the timestamp of the hash. The timestamp is stored in the timestampsStore.
     */
    function getTimestamp(bytes calldata hashValue)
        public
        view
        returns (
            TimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        Timestamps storage ts = timestampStorage();
        return ts.getTimestamp(hashValue);
    }

    /**
     * @dev returns the timestamp by timestampId (sha256(hashvalue)). The timestamp is stored in the timestampsStore.
     */
    function getTimestampById(bytes32 timestampId)
        public
        view
        returns (
            TimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        Timestamps storage ts = timestampStorage();
        return ts.getTimestampById(timestampId);
    }
}
