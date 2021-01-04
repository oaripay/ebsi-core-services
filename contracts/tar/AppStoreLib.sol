// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;

library AppStoreLib {
    // The state variables we care about.
    bytes32 public constant APP_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tar.app.storage");
    // enumeration of valid domains
    enum Domains {undefined, ebsi, external_domain}
    // enumeration of status
    enum Status {undefined, active, revoked, suspended}

    struct Application {
        // official application anme
        string applicationName;
        // application Id
        bytes32 applicationId;
        // list of administrator ids
        string[] administrators;
        // a list of public key ids
        bytes32[] publicKeyIds;
        // valid domain name
        Domains domain;
        // additional app information.
        // list of app info ids (SHA2-256 hash of the app info blob)
        // information is stored in the infoStore
        bytes32[] infoIds;
    }

    struct PublicKey {
        // application Id
        bytes32 applicationId;
        // encoded public key ids
        bytes publicKey;
        // status of the entry
        Status status;
        // date before the  key is not valid
        uint256 notBefore;
        // date at of after the key is not valid
        uint256 notAfter;
    }

    struct Applications {
        // list of application ids. Application id is a hash of the first registered application publick Key
        bytes32[] applicationIdList;
        // application name to id to mapping
        mapping(string => bytes32) nameToId;
        // application id to application object mapping
        mapping(bytes32 => Application) appStore;
        // info id to bytes encoded app info mapping
        mapping(bytes32 => bytes) infoStore;
        // application id to application object mapping
        mapping(bytes32 => PublicKey) publicKeyStore;
    }
}
