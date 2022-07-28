// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./AppStoreLib.sol";

library AdminAuthLib {
    /**
     * Checks if the sender controls the DID of one of the
     * administrators of the App
     */
    function senderIsAppAdmin(
        AppStoreLib.Applications storage apps,
        bytes32 appId
    ) internal view returns (bool) {
        string[] storage appAdmins = apps.appStore[appId].administrators;
        for (uint256 i = 0; i < appAdmins.length; i++) {
            string storage did = appAdmins[i];
            if (apps.didRegistry.checkController(bytes(did), msg.sender)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the sender is authorized by the Trusted Policy Registry
     * by looking his attribute, or if the sender is the administrator
     * of the App
     */
    function requirePolicyOrAppAdmin(
        AppStoreLib.Applications storage apps,
        string memory tprAttribute,
        bytes32 appId
    ) internal view {
        require(
            apps.trustedPolicyRegistry.checkPolicy(tprAttribute, msg.sender) ||
                senderIsAppAdmin(apps, appId),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of any of the adminitrators of app '",
                    apps.appStore[appId].applicationName,
                    "' and it doesn't have the attribute ",
                    tprAttribute
                )
            )
        );
    }

    function requirePolicy(
        AppStoreLib.Applications storage apps,
        string memory tprAttribute
    ) internal view {
        require(
            apps.trustedPolicyRegistry.checkPolicy(tprAttribute, msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender doesn't have the attribute ",
                    tprAttribute
                )
            )
        );
    }

    function requireDidController(
        AppStoreLib.Applications storage apps,
        string memory did
    ) internal view {
        require(
            apps.didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did
                )
            )
        );
    }
}
