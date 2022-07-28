// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";
import "./DidStorage.sol";
import "./HashAlgoDetailed.sol";
import "./DidPolicyDetailed.sol";
import "./DidTimestampDetailed.sol";
import "./DidRecordDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract DidRegistry is
    DidStorage,
    HashAlgoDetailed,
    DidPolicyDetailed,
    DidTimestampDetailed,
    DidRecordDetailed,
    Initializable
{
    function initialize(uint256 v) public initializer {
        _onInitialize(v);
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
            // PROD TPR Address
            tprAddress = 0x18B271cCb08704d0F819284637225e31fF0B5EA9;
        }

        hs.trustedPolicyRegistry = IPolicyRegistry(tprAddress);
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        TSC storage ts = DidStorage.tscStorage();
        ts.version = _version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        TSC storage ts = DidStorage.tscStorage();
        return ts.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        TSC storage ts = DidStorage.tscStorage();
        ts.version = _version;
    }
}
