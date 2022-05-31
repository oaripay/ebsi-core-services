// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./TarDetailed.sol";
import "./TarPolicyDetailed.sol";
import "./AuthorizationDetailed.sol";
import "./RevocationDetailed.sol";
import "./AppDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tar is
    Initializable,
    TarDetailed,
    AppDetailed,
    TarPolicyDetailed,
    RevocationDetailed,
    AuthorizationDetailed
{
    function initialize(uint256 _version) public initializer {
        TarDetailed.init(_version);
    }

    function setRegistryAddresses() public {
        AppStoreLib.Applications storage ts = appStorage();

        uint256 id;
        assembly {
            id := chainid()
        }

        address tprAddress;
        address didrAddress;

        if (id == 6175) {
            // test environment
            tprAddress = 0x17a340418937A38b3Cb62FdA42241eB0722868A6;
            didrAddress = 0x15582f47140FF4bD74843583A1E3111032fb91C8;
        } else if (id == 6176) {
            // preprod environment
            tprAddress = 0xF56ad0cd0CE8D9d598E15b3B8b915cb6bA83d1Fa;
            didrAddress = 0x78c310309A973AFDCbb88169A16941790137fDBe;
        } else if (id == 31337) {
            // unit tests. see tests/testAddress.ts
            tprAddress = 0xb2a560271ce08135e245F490b8794794A13a1208;
            didrAddress = 0xf6080028519B49D94C846bd34e30f72586E3F5d5;
        } else if (id == 7176) {
            // unit tests. see tests/testAddress.ts
            tprAddress = 0x88aaea75E5D6965B526Cf2D940De22f4Ee314760;
            didrAddress = 0x1D35980117DF109dbDfD57c0858FeeC61b7F52EB;
        } else if (id == 6177) {
            // unit tests. see tests/testAddress.ts
            tprAddress = 0x18B271cCb08704d0F819284637225e31fF0B5EA9;
            didrAddress = 0xeF719c562a30E5865159F673FB40497981980e1B;
        }

        ts.trustedPolicyRegistry = IPolicyRegistry(tprAddress);
        ts.didRegistry = IDidRegistry(didrAddress);
    }
}
