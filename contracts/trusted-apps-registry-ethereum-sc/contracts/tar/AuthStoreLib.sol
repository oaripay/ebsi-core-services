// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./AppStoreLib.sol";

library AuthStoreLib {
    // The state variables we care about.
    bytes32 public constant AUTHORIZATION_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tar.authorization.storage");

    struct Authorization {
        // application id
        bytes32 applicationId;
        // authorized application id
        bytes32 authorizedApplicationId;
        // did of the authorization issuer
        string iss;
        // authorization status: active, revoked
        AppStoreLib.Status status;
        // bitmap of authorized permissions based on CRUD
        uint8 permissions;
        // date before the authorization is not valid
        uint256 notBefore;
        // date at of after the authorization is not valid
        uint256 notAfter;
    }

    struct AuthorizedApps {
        // list of application id of  authorized apps
        bytes32[] authorizedAppIds;
        /* Info about authorization issuer and validity
           authorizedAppId => authorizationIds
           authorizedAppId: authorized application id
           authorizationIds: List of authorization ids.
           authorizations are stored in the authorization store.
           authorization ID: sha-256(appId|authorizedAppId)
        */
        mapping(bytes32 => bytes32[]) authorizations;
    }

    struct Authorizations {
        // collection of app authorizations  applicationID => AuthorizedApps
        mapping(bytes32 => AuthorizedApps) authorizedAppsStore;
        // collection of authorizations  authorizationID =>  Authorization
        mapping(bytes32 => Authorization) authorizationStore;
    }
}
