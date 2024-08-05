// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "./TimestampLib.sol";
import "./HashAlgoLib.sol";

abstract contract TimestampDetailed is TimestampStorage {
    using TimestampLib for Timestamps;

    uint256[50] private __gap;

    event TimestampedHashes(
        bytes32[] timestampIds,
        uint256[] hashAlgorithmIds,
        bytes[] hashValues,
        bytes[] timestampData
    );

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
     * @dev returns the timestamp of the hash. The timestamp is stored in the timestampsStore.
     */
    function getTimestamp(
        bytes calldata hashValue
    )
        external
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
    function getTimestampById(
        bytes32 timestampId
    )
        external
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
