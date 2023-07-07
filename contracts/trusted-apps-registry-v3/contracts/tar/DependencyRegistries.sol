// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/did-registry-v3/contracts/did-registry/interfaces/IDidRegistry.sol";
import "@ebsiint-sc/trusted-policies-registry-v2/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";
import "./AppStoreLib.sol";
import "./AppStorage.sol";

abstract contract DependencyRegistries is AppStorage {
    // internal functions

    /**
     * Checks if the sender controls the DID of one of the
     * administrators of the App
     */
    function senderIsAppAdmin(bytes32 appId) internal view returns (bool) {
        AppStoreLib.Applications storage apps = appStorage();
        string[] storage appAdmins = apps.appStore[appId].administrators;
        for (uint256 i = 0; i < appAdmins.length; i++) {
            string storage did = appAdmins[i];
            if (getDidRegistry().checkController(bytes(did), msg.sender)) {
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
        string memory tprAttribute,
        bytes32 appId
    ) internal view {
        AppStoreLib.Applications storage apps = appStorage();
        require(
            getTrustedPolicyRegistry().checkPolicy(tprAttribute, msg.sender) ||
                senderIsAppAdmin(appId),
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

    function requirePolicy(string memory tprAttribute) internal view {
        require(
            getTrustedPolicyRegistry().checkPolicy(tprAttribute, msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender doesn't have the attribute ",
                    tprAttribute
                )
            )
        );
    }

    function requireDidController(string memory did) internal view {
        require(
            getDidRegistry().checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did
                )
            )
        );
    }

    function getDidRegistry() internal view virtual returns (IDidRegistry);

    function getTrustedPolicyRegistry()
        internal
        view
        virtual
        returns (IPolicyRegistry);
}
