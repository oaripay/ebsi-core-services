// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./DidTimestampLib.sol";
import "./HashAlgoLib.sol";

contract DidTimestampDetailed is DidTimestampStorage {
    using DidTimestampLib for DidTimestamps;
    event DidTimestampedHash(
        bytes32 timestampId,
        uint256 hashAlgorithmId,
        bytes hashValue,
        bytes timestampData
    );

    /**
     * @dev  timestamps one or more hashes. Up to three hashes can be timestamped at a time.
     */
    function didTimestampHash(
        uint256 hashAlgorithmId,
        bytes calldata hashValue,
        bytes calldata timestampData
    ) external returns (bytes32 timestampIds) {
        HashAlgos storage hs = hashAlgoStorage();
        DidTimestamps storage ts = didTimestampStorage();
        timestampIds = ts.didTimestampHash(
            hs,
            hashAlgorithmId,
            hashValue,
            timestampData
        );
        return timestampIds;
    }

    /**
     * @dev returns a paginated list of timestamp hashes. List of all timestamp ids is stored in the timestampIdsList
     */
    function getDidTimestamps(uint256 page, uint256 pageSize)
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
        DidTimestamps storage ts = didTimestampStorage();
        return ts.getDidTimestamps(page, pageSize);
    }

    /**
     * @dev returns the timestamp of the hash. The timestamp is stored in the timestampsStore.
     */
    function getDidTimestamp(bytes calldata hashValue)
        public
        view
        returns (
            DidTimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        DidTimestamps storage ts = didTimestampStorage();
        return ts.getDidTimestamp(hashValue);
    }

    /**
     * @dev returns the timestamp by timestampId (sha256(hashvalue)). The timestamp is stored in the timestampsStore.
     */
    function getDidTimestampById(bytes32 timestampId)
        public
        view
        returns (
            DidTimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        DidTimestamps storage ts = didTimestampStorage();
        return ts.getDidTimestampById(timestampId);
    }
}
