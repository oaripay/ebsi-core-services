// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./HashAlgoStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

library HashAlgoLib {
    using Pagination for uint256;

    event AddNewHashAlgo(
        uint256 indexed hashId,
        string indexed ianaNameHash,
        string ianaName,
        uint256 outputLength,
        string oid,
        HashAlgoStorage.Status status
    );

    event UpdateHashAlgo(
        uint256 indexed hashId,
        string indexed ianaNameHash,
        string ianaName,
        uint256 outputLength,
        string oid,
        HashAlgoStorage.Status status
    );

    /**
     * @dev insertHashAlgorithm enables to register a new hash algorithm.
     */
    function insertHashAlgorithm(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 outputLength,
        string memory ianaName,
        string memory oid,
        HashAlgoStorage.Status status
    ) external {
        require(outputLength > 0, "outputLength==0");
        require(keccak256(bytes(oid)) != keccak256(bytes("")), "oid empty");
        require(
            keccak256(bytes(ianaName)) != keccak256(bytes("")),
            "ianaName empty"
        );
        require(uint256(status) > 0, "status==0");
        uint256 hashId = hs.hashAlgorithms.numberOfAlgorithms;
        // Add an entry to the hashAlgorithms.id enum. Value is the ianaName
        hs.hashAlgorithms.id[hashId] = ianaName;
        // Store the hashAlgorithmInfo in the hashAlgorighmInfoStore[id]

        hs.infoStore[hashId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status
        );

        // Increment the hashAlgorithms.numberOfAlgorithms value
        hs.hashAlgorithms.numberOfAlgorithms = hashId + 1;

        emit AddNewHashAlgo(
            hashId,
            ianaName,
            ianaName,
            outputLength,
            oid,
            status
        );
    }

    /**
     * @dev updateHashAlgorithm updates an existing hash algorithm info.
     */
    function updateHashAlgorithm(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 hashAlgorithmId,
        uint256 outputLength,
        string memory ianaName,
        string memory oid,
        HashAlgoStorage.Status status
    ) external {
        require(outputLength > 0, "outputLength==0");
        require(keccak256(bytes(oid)) != keccak256(bytes("")), "oid empty");
        require(
            keccak256(bytes(ianaName)) != keccak256(bytes("")),
            "ianaName empty"
        );
        require(uint256(status) > 0, "status==0");
        require(
            bytes(hs.hashAlgorithms.id[hashAlgorithmId]).length > 0,
            "hashAlgorithmId unknown"
        );
        // TODO Only EBSI Admins can register new algorithms.

        // Add an entry to the hashAlgorithms.id enum. Value is the ianaName
        hs.hashAlgorithms.id[hashAlgorithmId] = ianaName;

        // Store the hashAlgorithmInfo in the hashAlgorighmInfoStore[id]
        hs.infoStore[hashAlgorithmId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status
        );

        emit UpdateHashAlgo(
            hashAlgorithmId,
            ianaName,
            ianaName,
            outputLength,
            oid,
            status
        );
    }

    /**
     * @dev Returns the hash algorithm details by the algorithm id
     */
    function getHashAlgorithmById(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 hashAlgorithmId
    )
        public
        view
        returns (
            uint256 outputLength,
            string memory ianaName,
            string memory oid,
            HashAlgoStorage.Status status
        )
    {
        require(
            hs.infoStore[hashAlgorithmId].outputLength > 0,
            "hashAlgo unknown"
        );

        outputLength = hs.infoStore[hashAlgorithmId].outputLength;
        ianaName = hs.infoStore[hashAlgorithmId].ianaName;
        oid = hs.infoStore[hashAlgorithmId].oid;
        status = hs.infoStore[hashAlgorithmId].status;
    }

    /**
     * @dev Returns a paginated list of registered hash algorithm IDs.
     */
    function getHashAlgorithms(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            uint256[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return hs.hashAlgorithms.numberOfAlgorithms.paginate(page, pageSize);
    }
}
