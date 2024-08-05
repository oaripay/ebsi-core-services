// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "./HashAlgoStorage.sol";
import "./HashAlgoLib.sol";
import "@ebsiint-sc/trusted-policies-registry-v3/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

abstract contract HashAlgoDetailed is HashAlgoStorage {
    using HashAlgoLib for HashAlgos;

    uint256[50] private __gap;

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
     * @dev insertHashAlgo enables to register a new hash algorithm
     */
    function insertHashAlgorithm(
        uint256 outputLength,
        string memory ianaName,
        string memory oid,
        Status status,
        string memory multiHash
    ) external {
        require(
            getTrustedPolicyRegistry().checkPolicy(
                "TS:insertHashAlgorithm",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TS:insertHashAlgorithm"
        );
        HashAlgos storage hs = hashAlgoStorage();
        hs.insertHashAlgorithm(outputLength, ianaName, oid, status, multiHash);
    }

    /**
     * @dev updateHashAlgorithm updates an existing hash algorithm info.
     */
    function updateHashAlgorithm(
        uint256 hashAlgorithmId,
        uint256 outputLength,
        string memory ianaName,
        string memory oid,
        HashAlgoStorage.Status status,
        string memory multiHash
    ) external {
        require(
            getTrustedPolicyRegistry().checkPolicy(
                "TS:updateHashAlgorithm",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TS:updateHashAlgorithm"
        );
        HashAlgos storage hs = hashAlgoStorage();
        hs.updateHashAlgorithm(
            hashAlgorithmId,
            outputLength,
            ianaName,
            oid,
            status,
            multiHash
        );
    }

    /**
     * @dev getHashAlgorithmById returns hash algorithm details by the algorithm id.
     */
    function getHashAlgorithmById(
        uint256 hashAlgorithmId
    )
        external
        view
        returns (
            uint256 outputLength,
            string memory ianaName,
            string memory oid,
            Status status,
            string memory multiHash
        )
    {
        HashAlgos storage hs = hashAlgoStorage();
        return hs.getHashAlgorithmById(hashAlgorithmId);
    }

    // internal functions

    function getTrustedPolicyRegistry()
        internal
        view
        virtual
        returns (IPolicyRegistry);
}
