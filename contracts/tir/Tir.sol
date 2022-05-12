// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./TirDetailed.sol";
import "./IssuerDetailed.sol";
import "./TirPolicyDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tir is Initializable, TirDetailed, IssuerDetailed, TirPolicyDetailed {
    function initialize(uint256 version) public initializer {
        TirDetailed.init(version);
    }

    function setRegistryAddresses() public {
        Issuers storage ds = issuerStorage();

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
            // prod environment
            tprAddress = 0x18B271cCb08704d0F819284637225e31fF0B5EA9;
            didrAddress = 0xeF719c562a30E5865159F673FB40497981980e1B;
        }

        ds.trustedPolicyRegistry = IPolicyRegistry(tprAddress);
        ds.didRegistry = IDidRegistry(didrAddress);
    }
}
