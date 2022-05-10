// SPDX-License-Identifier: EUPL V1.2

pragma solidity ^0.8.0;
// solhint-disable-next-line max-line-length
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./SchemaSCStorage.sol";
import "./SchemaDetailed.sol";
import "./SchemaPolicyDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract SchemaSCRegistry is
    SchemaSCStorage,
    SchemaDetailed,
    SchemaPolicyDetailed,
    Initializable
{
    function initialize(uint256 version) public initializer {
        _onInitialize(version);
    }

    function setTrustedPoliciesRegistryAddress() public {
        Schemas storage ss = schemaStorage();
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
            // EBSI PROD TPR Address
            tprAddress = 0x18B271cCb08704d0F819284637225e31fF0B5EA9;
        }

        ss.trustedPolicyRegistry = IPolicyRegistry(tprAddress);
    }

    function _onInitialize(uint256 _version) internal initializer {
        TSC storage ts = SchemaSCStorage.tscStorage();
        ts.version = _version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        TSC storage ts = SchemaSCStorage.tscStorage();
        return ts.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        TSC storage ts = SchemaSCStorage.tscStorage();
        ts.version = _version;
    }
}
