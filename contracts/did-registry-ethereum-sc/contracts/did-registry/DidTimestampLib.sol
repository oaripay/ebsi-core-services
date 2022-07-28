// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./DidTimestampStorage.sol";
import "./HashAlgoStorage.sol";

library DidTimestampLib {
    using Pagination for bytes32[];
    event DidTimestampedHash(
        bytes32 timestampId,
        uint256 hashAlgorithmId,
        bytes hashValue,
        bytes timestampData
    );

    /**
     * @dev timestamps one or more hashes. Up to three hashes can be timestamped at a time.
     */
    function didTimestampHash(
        DidTimestampStorage.DidTimestamps storage ts,
        HashAlgoStorage.HashAlgos storage hs,
        uint256 hashAlgorithmId,
        bytes memory hashValue,
        bytes memory timestampData
    ) external returns (bytes32 timestampId) {
        require(hashValue.length > 0, "hashValue empty");
        // we don't require timestampData to be of same length as it is optional

        timestampId = sha256(hashValue);

        require(
            hs.infoStore[hashAlgorithmId].outputLength > 0,
            "hashAlgo unknown"
        );

        require(
            hs.infoStore[hashAlgorithmId].outputLength == hashValue.length * 8,
            "invalid hash length"
        );
        // insert only if it doesn't exist
        if (ts.didTimestampsStore[timestampId].hash.value.length == 0) {
            ts.didTimestampsStore[timestampId] = DidTimestampStorage
                .DidTimestamp(
                    DidTimestampStorage.Hash(hashAlgorithmId, hashValue),
                    msg.sender,
                    block.number,
                    timestampData.length > 0 ? timestampData : bytes("")
                );
            ts.didTimestampIdsList.push(timestampId);

            emit DidTimestampedHash(
                timestampId,
                hashAlgorithmId,
                hashValue,
                timestampData
            );
        }
    }

    /**
     * @dev returns a paginated list of timestamp hashes. List of all timestamp ids is stored in the timestampIdsList
     */
    function getDidTimestamps(
        DidTimestampStorage.DidTimestamps storage ts,
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

        return ts.didTimestampIdsList.paginate(page, pageSize);
    }

    /**
     * @dev returns the timestamp of the hash. The timestamp is stored in the timestampsStore.
     */
    function getDidTimestamp(
        DidTimestampStorage.DidTimestamps storage ts,
        bytes memory hashValue
    )
        public
        view
        returns (
            DidTimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        require(hashValue.length > 0, "hash empty");
        bytes32 tsId = sha256(hashValue);
        require(
            ts.didTimestampsStore[tsId].hash.value.length > 0,
            "timestamp unknown"
        );
        hash = ts.didTimestampsStore[tsId].hash;
        blockNumber = ts.didTimestampsStore[tsId].blockNumber;
        timestampedBy = ts.didTimestampsStore[tsId].timestampedBy;
        data = ts.didTimestampsStore[tsId].data;
    }

    /**
     * @dev returns the timestamp by timestampId (sha256(hashvalue)). The timestamp is stored in the timestampsStore.
     */
    function getDidTimestampById(
        DidTimestampStorage.DidTimestamps storage ts,
        bytes32 timestampId
    )
        public
        view
        returns (
            DidTimestampStorage.Hash memory hash,
            address timestampedBy,
            uint256 blockNumber,
            bytes memory data
        )
    {
        require(timestampId != bytes32(0), "tsId empty");

        require(
            ts.didTimestampsStore[timestampId].hash.value.length > 0,
            "timestamp unknown"
        );
        hash = ts.didTimestampsStore[timestampId].hash;
        blockNumber = ts.didTimestampsStore[timestampId].blockNumber;
        timestampedBy = ts.didTimestampsStore[timestampId].timestampedBy;
        data = ts.didTimestampsStore[timestampId].data;
    }
}
