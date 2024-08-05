// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "./HashAlgoStorage.sol";

library HashAlgoLib {
    event AddNewHashAlgo(
        uint256 indexed hashId,
        string ianaName,
        uint256 outputLength,
        string oid,
        HashAlgoStorage.Status status,
        string multiHash
    );

    event UpdateHashAlgo(
        uint256 indexed hashId,
        string ianaName,
        uint256 outputLength,
        string oid,
        HashAlgoStorage.Status status,
        string multiHash
    );

    /**
     * @dev insertHashAlgorithm enables to register a new hash algorithm.
     */
    function insertHashAlgorithm(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 outputLength,
        string memory ianaName,
        string memory oid,
        HashAlgoStorage.Status status,
        string memory multiHash
    ) external {
        require(outputLength > 0, "outputLength==0");
        require(uint256(status) > 0, "status==0");
        require(bytes(ianaName).length > 0, "ianaName unknown");
        require(!hs.ianaNameDefined[ianaName], "ianaName defined");
        uint256 hashId = hs.numberOfAlgorithms;

        hs.hashAlgorithms[hashId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status,
            multiHash
        );
        hs.ianaNameDefined[ianaName] = true;

        hs.numberOfAlgorithms++;

        emit AddNewHashAlgo(
            hashId,
            ianaName,
            outputLength,
            oid,
            status,
            multiHash
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
        HashAlgoStorage.Status status,
        string memory multiHash
    ) external {
        require(outputLength > 0, "outputLength==0");
        require(uint256(status) > 0, "status==0");
        require(
            hashAlgorithmId < hs.numberOfAlgorithms,
            "hashAlgorithmId unknown"
        );
        require(bytes(ianaName).length > 0, "ianaName unknown");
        hs.ianaNameDefined[hs.hashAlgorithms[hashAlgorithmId].ianaName] = false;
        hs.ianaNameDefined[ianaName] = true;

        // Store the hashAlgorithmInfo in the hashAlgorighmInfoStore[id]
        hs.hashAlgorithms[hashAlgorithmId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status,
            multiHash
        );

        emit UpdateHashAlgo(
            hashAlgorithmId,
            ianaName,
            outputLength,
            oid,
            status,
            multiHash
        );
    }

    /**
     * @dev Returns the hash algorithm details by the algorithm id
     */
    function getHashAlgorithmById(
        HashAlgoStorage.HashAlgos storage hs,
        uint256 hashAlgorithmId
    )
        external
        view
        returns (
            uint256 outputLength,
            string memory ianaName,
            string memory oid,
            HashAlgoStorage.Status status,
            string memory multiHash
        )
    {
        require(
            hs.hashAlgorithms[hashAlgorithmId].outputLength > 0,
            "hashAlgo unknown"
        );

        outputLength = hs.hashAlgorithms[hashAlgorithmId].outputLength;
        ianaName = hs.hashAlgorithms[hashAlgorithmId].ianaName;
        oid = hs.hashAlgorithms[hashAlgorithmId].oid;
        status = hs.hashAlgorithms[hashAlgorithmId].status;
        multiHash = hs.hashAlgorithms[hashAlgorithmId].multiHash;
    }
}
