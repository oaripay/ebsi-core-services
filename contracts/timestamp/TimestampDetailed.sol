// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
// solhint-disable-next-line max-line-length
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
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

    function setTrustedPoliciesRegistryAddress() public {
        HashAlgos storage hs = hashAlgoStorage();
        uint256 id;
        assembly {
            id := chainid()
        }
        address tprAddress;
        if (id == 6175) {
            // test environment
            tprAddress = 0x17a340418937A38b3Cb62FdA42241eB0722868A6;
        } else if (id == 6176) {
            // preprod environment
            tprAddress = 0xF56ad0cd0CE8D9d598E15b3B8b915cb6bA83d1Fa;
        } else if (id == 31337) {
            // unit tests. see tests/testAddress.ts
            tprAddress = 0xb2a560271ce08135e245F490b8794794A13a1208;
        } else if (id == 7176) {
            // SBSI TPR Address
            tprAddress = 0x88aaea75E5D6965B526Cf2D940De22f4Ee314760;
        } else if (id == 6177) {
            // SBSI TPR Address
            tprAddress = 0x18B271cCb08704d0F819284637225e31fF0B5EA9;
        }
        hs.trustedPolicyRegistry = IPolicyRegistry(tprAddress);
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
