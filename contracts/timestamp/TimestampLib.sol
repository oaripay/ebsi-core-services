// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./TimestampStorage.sol";
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

library TimestampLib {
    using Pagination for bytes32[];
    event TimestampedHashes(
        bytes32[] timestampIds,
        uint256[] hashAlgorithmIds,
        bytes[] hashValues,
        bytes[] timestampData
    );

    /**
     * @dev timestamps one or more hashes. Up to three hashes can be timestamped at a time.
     */
    function timestampHashes(
        TimestampStorage.Timestamps storage ts,
        HashAlgoStorage.HashAlgos storage hs,
        uint256[] memory hashAlgorithmIds,
        bytes[] memory hashValues,
        bytes[] memory timestampData
    ) external returns (bytes32[] memory timestampIds) {
        require(hashAlgorithmIds.length <= 3, "hashAlgorithmIds>3");
        require(hashValues.length <= 3, "hashValues>3");
        require(timestampData.length <= 3, "timestampData>3");
        // we don't require timestampData to be of same length as it is optional
        require(
            hashValues.length == hashAlgorithmIds.length,
            "hashvalue/algo count mismatch"
        );

        timestampIds = new bytes32[](hashAlgorithmIds.length);
        for (uint256 i = 0; i < hashAlgorithmIds.length; i++) {
            require(hashValues[i].length > 0, "hashValue empty");
            bytes32 tsId = sha256(hashValues[i]);
            timestampIds[i] = tsId;
            require(
                hs.infoStore[hashAlgorithmIds[i]].outputLength > 0,
                "hashAlgo unknown"
            );
            // insert only if it doesn't exist
            if (ts.timestampsStore[tsId].hash.value.length == 0) {
                ts.timestampsStore[tsId] = TimestampStorage.Timestamp(
                    TimestampStorage.Hash(hashAlgorithmIds[i], hashValues[i]),
                    msg.sender,
                    block.number,
                    timestampData.length > i ? timestampData[i] : bytes("")
                );
                ts.timestampIdsList.push(tsId);
            }
        }
        emit TimestampedHashes(
            timestampIds,
            hashAlgorithmIds,
            hashValues,
            timestampData
        );
        return timestampIds;
    }

    /**
     * @dev returns a paginated list of timestamp hashes. List of all timestamp ids is stored in the timestampIdsList
     */
    function getTimestamps(
        TimestampStorage.Timestamps storage ts,
        uint256 page,
        uint256 pageSize
    )
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return ts.timestampIdsList.paginate(page, pageSize);
    }

    /**
     * @dev returns the timestamp of the hash. The timestamp is stored in the timestampsStore.
     */
    function getTimestamp(
        TimestampStorage.Timestamps storage ts,
        bytes memory hashValue
    )
        public
        view
        returns (
            TimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        require(hashValue.length > 0, "hash empty");
        bytes32 tsId = sha256(hashValue);
        require(
            ts.timestampsStore[tsId].hash.value.length > 0,
            "timestamp unknown"
        );
        hash = ts.timestampsStore[tsId].hash;
        blockNumber = ts.timestampsStore[tsId].blockNumber;
        timestampedBy = ts.timestampsStore[tsId].timestampedBy;
        data = ts.timestampsStore[tsId].data;
    }

    /**
     * @dev returns the timestamp by timestampId (sha256(hashvalue)). The timestamp is stored in the timestampsStore.
     */
    function getTimestampById(
        TimestampStorage.Timestamps storage ts,
        bytes32 timestampId
    )
        public
        view
        returns (
            TimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        require(timestampId != bytes32(0), "tsId empty");

        require(
            ts.timestampsStore[timestampId].hash.value.length > 0,
            "timestamp unknown"
        );
        hash = ts.timestampsStore[timestampId].hash;
        blockNumber = ts.timestampsStore[timestampId].blockNumber;
        timestampedBy = ts.timestampsStore[timestampId].timestampedBy;
        data = ts.timestampsStore[timestampId].data;
    }
}
