// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./DidDocumentStorage.sol";
import "./ControllersStorage.sol";
import "./DidDocumentLib.sol";
import "./ControllersLib.sol";
import "@ebsiint-sc/trusted-policies-registry/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";
import "./interfaces/IDidRegistry.sol";

abstract contract DidDocumentDetailed is
    DidDocumentStorage,
    ControllersStorage,
    VRelationshipsStorage
{
    using DidDocumentLib for DidDocuments;
    using ControllersLib for Controllers;
    using VRelationshipsLib for VRelationships;

    event DidDocumentInserted(
        string did,
        string baseDocument,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    );

    event BaseDocumentUpdated(string did, string baseDocument);

    event ControllerAdded(string did, string controller);

    event ControllerRevoked(string did, string controller);

    event VerificationMethodAdded(
        string did,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1
    );

    event VerificationRelationshipAdded(
        string did,
        string name,
        string vMethodId,
        uint256 notBefore,
        uint256 notAfter
    );

    event VerificationMethodRevoked(
        string did,
        string vMethodId,
        uint256 notAfter
    );

    event VerificationMethodExpired(
        string did,
        string vMethodId,
        uint256 notAfter
    );

    event VerificationMethodRolled(
        string did,
        string vMethodId,
        bytes publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter,
        string oldVMethodId,
        uint256 duration
    );

    function insertDidDocument(
        string memory did,
        string memory baseDocument,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        require(isSecp256k1, "first publicKey must be for secp256k1");
        DidDocuments storage ds = didDocumentStorage();
        Controllers storage cs = controllersStorage();
        VRelationships storage vs = vRelationshipsStorage();
        bool result = ds.insertDidDocument(
            vs,
            did,
            baseDocument,
            vMethodId,
            publicKey,
            isSecp256k1,
            notBefore,
            notAfter
        );
        cs.linkDidToController(did, did);
        emit DidDocumentInserted(
            did,
            baseDocument,
            vMethodId,
            publicKey,
            isSecp256k1,
            notBefore,
            notAfter
        );
        return result;
    }

    function updateBaseDocument(
        string memory did,
        string memory baseDocument
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:updateBaseDocument");
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.updateBaseDocument(did, baseDocument);
        emit BaseDocumentUpdated(did, baseDocument);
        return result;
    }

    function addController(
        string memory did,
        string memory controller
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:addController");
        DidDocuments storage ds = didDocumentStorage();
        Controllers storage cs = controllersStorage();
        bool result = ds.addController(did, controller);
        cs.linkDidToController(did, controller);
        emit ControllerAdded(did, controller);
        return result;
    }

    function revokeController(
        string memory did,
        string memory controller
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:revokeController");
        DidDocuments storage ds = didDocumentStorage();
        Controllers storage cs = controllersStorage();
        bool result = ds.revokeController(did, controller);
        cs.unlinkDidFromController(did, controller);
        emit ControllerRevoked(did, controller);
        return result;
    }

    function addVerificationMethod(
        string memory did,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:addVerificationMethod");
        DidDocuments storage ds = didDocumentStorage();
        bool result = ds.addVerificationMethod(
            did,
            vMethodId,
            publicKey,
            isSecp256k1
        );
        emit VerificationMethodAdded(did, vMethodId, publicKey, isSecp256k1);
        return result;
    }

    function addVerificationRelationship(
        string memory did,
        string memory name,
        string memory vMethodId,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:addVerificationRelationship");
        DidDocuments storage ds = didDocumentStorage();
        VRelationships storage vs = vRelationshipsStorage();
        bool result = ds.addVerificationRelationship(
            vs,
            did,
            name,
            vMethodId,
            notBefore,
            notAfter
        );
        emit VerificationRelationshipAdded(
            did,
            name,
            vMethodId,
            notBefore,
            notAfter
        );
        return result;
    }

    function revokeVerificationMethod(
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:revokeVerificationMethod");
        DidDocuments storage ds = didDocumentStorage();
        VRelationships storage vs = vRelationshipsStorage();
        bool result = ds.revokeVerificationMethod(vs, did, vMethodId, notAfter);
        emit VerificationMethodRevoked(did, vMethodId, notAfter);
        return result;
    }

    function expireVerificationMethod(
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    ) external returns (bool) {
        onlyControllerOrAuth(did, "DID:expireVerificationMethod");
        DidDocuments storage ds = didDocumentStorage();
        VRelationships storage vs = vRelationshipsStorage();
        bool result = ds.expireVerificationMethod(vs, did, vMethodId, notAfter);
        emit VerificationMethodExpired(did, vMethodId, notAfter);
        return result;
    }

    function rollVerificationMethod(
        RollArgs memory args
    ) external returns (bool) {
        onlyControllerOrAuth(args.did, "DID:rollVerificationMethod");
        DidDocuments storage ds = didDocumentStorage();
        VRelationships storage vs = vRelationshipsStorage();

        ds.rollVerificationMethod(vs, args);
        emit VerificationMethodRolled(
            args.did,
            args.vMethodId,
            args.publicKey,
            args.isSecp256k1,
            args.notBefore,
            args.notAfter,
            args.oldVMethodId,
            args.duration
        );
        return true;
    }

    function getDids(
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidDocuments storage ds = didDocumentStorage();
        return ds.getDids(page, pageSize);
    }

    function getDidsByController(
        string memory controller,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidDocuments storage ds = didDocumentStorage();
        Controllers storage cs = controllersStorage();
        require(
            bytes(ds.didList[controller].baseDocument).length > 0,
            "controller doesn't exist"
        );
        return cs.getDidsByController(controller, page, pageSize);
    }

    function getDidsByVerificationRelationship(
        string memory vMethodId,
        string memory name,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            DidWithPeriod[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        VRelationships storage vs = vRelationshipsStorage();
        uint256 vrId = uint256(keccak256(abi.encodePacked(name, vMethodId)));
        return vs.getDidsByVerificationRelationshipId(vrId, page, pageSize);
    }

    function getDidDocument(
        string memory did
    )
        external
        view
        returns (
            string memory baseDocument,
            string[] memory controllers,
            string[] memory vMethodIds,
            DidDocumentStorage.VMethod[] memory vMethods,
            DidDocumentStorage.VRelationship[] memory vRelationships
        )
    {
        DidDocuments storage ds = didDocumentStorage();
        return ds.getDidDocumentByTimestamp(did, block.timestamp);
    }

    function getDidDocumentByTimestamp(
        string memory did,
        uint256 timestamp
    )
        external
        view
        returns (
            string memory baseDocument,
            string[] memory controllers,
            string[] memory vMethodIds,
            DidDocumentStorage.VMethod[] memory vMethods,
            DidDocumentStorage.VRelationship[] memory vRelationships
        )
    {
        DidDocuments storage ds = didDocumentStorage();
        return ds.getDidDocumentByTimestamp(did, timestamp);
    }

    function checkController(
        string memory did,
        address controller
    ) external view returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        if (bytes(ds.didList[did].baseDocument).length > 0) {
            return _checkController(did, controller);
        }

        // the DID doesn't exist. Check in the previous version of DID SC
        return getDidRegistryV2().checkController(bytes(did), controller);
    }

    function checkController(
        bytes memory did,
        address controller
    ) external view returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        if (bytes(ds.didList[string(did)].baseDocument).length > 0) {
            return _checkController(string(did), controller);
        }

        // the DID doesn't exist. Check in the previous version of DID SC
        return getDidRegistryV2().checkController(did, controller);
    }

    // internal

    function _checkController(
        string memory did,
        address controller
    ) internal view returns (bool) {
        DidDocuments storage ds = didDocumentStorage();
        DidDocumentStorage.DidDocument storage d = ds.didList[did];

        // check did exist
        require(bytes(d.baseDocument).length > 0, "did doesn't exist");

        // check all controllers
        for (uint256 i = 0; i < d.controllers.length; i++) {
            // get DID Document of the controller
            DidDocumentStorage.DidDocument storage docController = ds.didList[
                d.controllers[i]
            ];

            // check all capabilityInvocations
            string memory vMethodId = docController.vMethodIdOfAddress[
                controller
            ];

            if (bytes(vMethodId).length > 0) {
                if (
                    docController.capabilityInvocationMethodIdExist[vMethodId]
                ) {
                    DidDocumentStorage.VRelationship memory vRelationship;
                    vRelationship = docController.capabilityInvocations[
                        docController.capabilityInvocationMethodIdIndex[
                            vMethodId
                        ]
                    ];
                    if (
                        block.timestamp > vRelationship.notBefore &&
                        vRelationship.notAfter > block.timestamp
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function onlyControllerOrAuth(
        string memory did,
        string memory tprAttribute
    ) internal view {
        DidDocuments storage ds = didDocumentStorage();
        DidDocumentStorage.DidDocument storage d = ds.didList[did];

        // check did exist
        require(bytes(d.baseDocument).length > 0, "did doesn't exist");

        bool isController = _checkController(did, msg.sender);

        if (isController) {
            return;
        } else {
            bool isAuthorized = getTrustedPolicyRegistry().checkPolicy(
                tprAttribute,
                msg.sender
            );
            require(
                isAuthorized,
                string(
                    abi.encodePacked(
                        "not controller and not authorized for policy ",
                        tprAttribute
                    )
                )
            );
            return;
        }
    }

    function getTrustedPolicyRegistry()
        internal
        view
        virtual
        returns (IPolicyRegistry);

    function getDidRegistryV2() internal view virtual returns (IDidRegistry);

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;
}
