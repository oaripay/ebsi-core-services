// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./HashAlgoStorage.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";

library HashAlgoLib {
    using Pagination for uint256;

    event AddNewHashAlgo(
        uint256 indexed hashId,
        string indexed ianaNameHash,
        string ianaName,
        uint256 outputLength,
        string oid,
        HashAlgoStorage.Status status,
        string multiHash
    );

    event UpdateHashAlgo(
        uint256 indexed hashId,
        string indexed ianaNameHash,
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
        require(
            hs.trustedPolicyRegistry.checkPolicy(
                "TS:insertHashAlgorithm",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TS:insertHashAlgorithm"
        );
        require(outputLength > 0, "outputLength==0");
        require(uint256(status) > 0, "status==0");
        require(bytes(ianaName).length > 0, "ianaName unknown");
        uint256 hashId = hs.hashAlgorithms.numberOfAlgorithms;

        // Add an entry to the hashAlgorithms.id enum. Value is the ianaName
        hs.hashAlgorithms.id[hashId] = ianaName;
        // Store the hashAlgorithmInfo in the hashAlgorighmInfoStore[id]

        hs.infoStore[hashId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status,
            multiHash
        );

        // Increment the hashAlgorithms.numberOfAlgorithms value
        hs.hashAlgorithms.numberOfAlgorithms = hashId + 1;

        emit AddNewHashAlgo(
            hashId,
            ianaName,
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
        require(
            hs.trustedPolicyRegistry.checkPolicy(
                "TS:updateHashAlgorithm",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TS:updateHashAlgorithm"
        );
        require(outputLength > 0, "outputLength==0");
        require(uint256(status) > 0, "status==0");
        require(
            bytes(hs.hashAlgorithms.id[hashAlgorithmId]).length > 0,
            "hashAlgorithmId unknown"
        );
        require(bytes(ianaName).length > 0, "ianaName unknown");
        require(
            keccak256(abi.encodePacked((ianaName))) !=
                keccak256(
                    abi.encodePacked((hs.hashAlgorithms.id[hashAlgorithmId]))
                ),
            "ianaName value already set"
        );

        // Add an entry to the hashAlgorithms.id enum. Value is the ianaName
        hs.hashAlgorithms.id[hashAlgorithmId] = ianaName;

        // Store the hashAlgorithmInfo in the hashAlgorighmInfoStore[id]
        hs.infoStore[hashAlgorithmId] = HashAlgoStorage.HashAlgoInfo(
            outputLength,
            ianaName,
            oid,
            status,
            multiHash
        );

        emit UpdateHashAlgo(
            hashAlgorithmId,
            ianaName,
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
        public
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
            hs.infoStore[hashAlgorithmId].outputLength > 0,
            "hashAlgo unknown"
        );

        outputLength = hs.infoStore[hashAlgorithmId].outputLength;
        ianaName = hs.infoStore[hashAlgorithmId].ianaName;
        oid = hs.infoStore[hashAlgorithmId].oid;
        status = hs.infoStore[hashAlgorithmId].status;
        multiHash = hs.infoStore[hashAlgorithmId].multiHash;
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
