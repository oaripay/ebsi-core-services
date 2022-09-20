// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./DidDocumentStorage.sol";

library DidDocumentLib {
    using Pagination for string[];

    function equalStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function getAddress(bytes storage publicKey)
        internal
        view
        returns (address)
    {
        /**
         * step 1: Remove the compression prefix (04, 03, or 02)
         * Note: We can not use the built-in array slices (like publicKey[1:])
         * because it is only for calldata arrays, not storage arrays.
         * Then we have to use a loop to make the slice
         */
        bytes memory publicKeyWithoutPrefix = new bytes(publicKey.length - 1);
        for (uint256 i = 1; i < publicKey.length; i++) {
            publicKeyWithoutPrefix[i - 1] = publicKey[i];
        }

        // step 2: Evaluate keccak256 and get the latest 20 bytes
        return address(uint160(uint256(keccak256(publicKeyWithoutPrefix))));
    }

    modifier onlyControllerOrAuth(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory tprAttribute
    ) {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];

        // check did exist
        require(bytes(d.baseDocument).length > 0, "did doesn't exist");

        bool isController = false;

        // check all controllers
        for (uint256 i = 0; i < d.controllers.length; i++) {
            // get DID Document of the controller
            DidDocumentStorage.DidDocument storage docController = ds.didList[
                d.controllers[i]
            ];

            // check all capabilityInvocations
            for (
                uint256 j = 0;
                j < docController.capabilityInvocations.length;
                j++
            ) {
                // get vMethod
                string storage vMethodId = docController
                    .capabilityInvocations[j]
                    .vMethodId;
                DidDocumentStorage.VMethod storage vMethod = docController
                    .vMethods[vMethodId];

                // filter verification methods for secp256k1
                if (
                    vMethod.isSecp256k1 &&
                    getAddress(vMethod.publicKey) == msg.sender
                ) {
                    isController = true;
                    break;
                }
            }

            if (isController) {
                break;
            }
        }

        if (isController) {
            _;
        } else {
            bool isAuthorized = ds.trustedPolicyRegistry.checkPolicy(
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
            _;
        }
    }

    function insertDidDocument(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory baseDocument,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (bool) {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(bytes(did).length > 0, "invalid did");
        require(bytes(baseDocument).length > 0, "invalid baseDocument");
        require(bytes(vMethodId).length > 0, "invalid vMethodId");
        require(publicKey.length > 0, "invalid publicKey");
        require(isSecp256k1, "first publicKey must be for secp256k1");
        require(notAfter == 0 || notBefore <= notAfter, "invalid dates");

        require(bytes(d.baseDocument).length == 0, "did already exist");

        d.baseDocument = baseDocument;
        d.controllers.push(did);
        d.vMethods[vMethodId] = DidDocumentStorage.VMethod(
            publicKey,
            true,
            false
        );
        d.capabilityInvocations.push(
            DidDocumentStorage.VRelationship(
                "capabilityInvocation",
                vMethodId,
                notBefore,
                notAfter
            )
        );

        return true;
    }

    function updateBaseDocument(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory baseDocument
    )
        external
        onlyControllerOrAuth(ds, did, "DID:updateBaseDocument")
        returns (bool)
    {
        require(bytes(baseDocument).length > 0, "invalid baseDocument");
        ds.didList[did].baseDocument = baseDocument;
        return true;
    }

    function addController(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory controller
    )
        external
        onlyControllerOrAuth(ds, did, "DID:addController")
        returns (bool)
    {
        require(
            bytes(ds.didList[controller].baseDocument).length > 0,
            "controller doesn't exist"
        );
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        for (uint256 i = 0; i < d.controllers.length; i++) {
            require(
                !equalStrings(d.controllers[i], controller),
                "it is already a controller"
            );
        }
        d.controllers.push(controller);
        return true;
    }

    function revokeController(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory controller
    )
        external
        onlyControllerOrAuth(ds, did, "DID:revokeController")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        bool found = false;
        for (uint256 i = 0; i < d.controllers.length; i++) {
            if (equalStrings(d.controllers[i], controller)) {
                // swap with the last controller and pop the last one
                d.controllers[d.controllers.length - 1] = d.controllers[i];
                d.controllers.pop();
                found = true;
                break;
            }
        }
        require(found, "controller not found");
        return true;
    }

    function addVerificationMethod(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory vMethodId,
        bytes memory publicKey,
        bool isSecp256k1
    )
        external
        onlyControllerOrAuth(ds, did, "DID:addVerificationMethod")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(bytes(vMethodId).length > 0, "invalid vMethodId");
        require(publicKey.length > 0, "invalid publicKey");
        require(
            d.vMethods[vMethodId].publicKey.length == 0,
            "vMethodId already exist"
        );

        d.vMethods[vMethodId] = DidDocumentStorage.VMethod(
            publicKey,
            isSecp256k1,
            false
        );

        return true;
    }

    function addVerificationRelationship(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory name,
        string memory vMethodId,
        uint256 notBefore,
        uint256 notAfter
    )
        external
        onlyControllerOrAuth(ds, did, "DID:addVerificationRelationship")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(bytes(name).length > 0, "invalid name");
        require(notAfter == 0 || notBefore <= notAfter, "invalid dates");
        require(
            d.vMethods[vMethodId].publicKey.length > 0,
            "vMethodId doesn't exist"
        );

        if (equalStrings(name, "capabilityInvocation")) {
            // is a capabilityInvocation

            // check that the tuple (name, vMethodId) is unique in the relationships
            for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
                // "vMethodId" should be different
                require(
                    !equalStrings(
                        vMethodId,
                        d.capabilityInvocations[i].vMethodId
                    ),
                    "capabilityInvocation already exist"
                );
            }

            d.capabilityInvocations.push(
                DidDocumentStorage.VRelationship(
                    "capabilityInvocation",
                    vMethodId,
                    notBefore,
                    notAfter
                )
            );
        } else {
            // is a different verification relationship

            // check that the tuple (name, vMethodId) is unique in the relationships
            for (uint256 i = 0; i < d.vRelationships.length; i++) {
                // either "name" or "vMethodId" should be different
                require(
                    !equalStrings(name, d.vRelationships[i].name) ||
                        !equalStrings(vMethodId, d.vRelationships[i].vMethodId),
                    "relationship already exist"
                );
            }

            d.vRelationships.push(
                DidDocumentStorage.VRelationship(
                    name,
                    vMethodId,
                    notBefore,
                    notAfter
                )
            );
        }
        return true;
    }

    function revokeVerificationMethod(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    )
        external
        onlyControllerOrAuth(ds, did, "DID:revokeVerificationMethod")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(notAfter <= block.timestamp, "invalid notAfter");
        require(
            d.vMethods[vMethodId].publicKey.length > 0,
            "vMethodId doesn't exist"
        );

        for (uint256 i = 0; i < d.vRelationships.length; i++) {
            if (equalStrings(vMethodId, d.vRelationships[i].vMethodId)) {
                d.vRelationships[i].notAfter = notAfter;
            }
        }

        for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
            if (equalStrings(vMethodId, d.capabilityInvocations[i].vMethodId)) {
                d.capabilityInvocations[i].notAfter = notAfter;
            }
        }

        d.vMethods[vMethodId].revoked = true;

        return true;
    }

    function getDidDocument(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did
    )
        public
        view
        returns (
            string memory baseDocument,
            string[] memory controllers,
            string[] memory vMethodIds,
            DidDocumentStorage.VMethod[] memory vMethods,
            DidDocumentStorage.VRelationship[] memory vRelationships
        )
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        baseDocument = d.baseDocument;
        controllers = d.controllers;
        string[] memory vMethodIdsAux = new string[](50);
        DidDocumentStorage.VMethod[]
            memory vMethodsAux = new DidDocumentStorage.VMethod[](50);
        DidDocumentStorage.VRelationship[]
            memory vRelationshipsAux = new DidDocumentStorage.VRelationship[](
                50
            );
        uint256 sizeVMethods = 0;
        uint256 sizeVRelationships = 0;
        for (uint256 i = 0; i < d.vRelationships.length; i++) {
            if (
                block.timestamp < d.vRelationships[i].notBefore ||
                block.timestamp > d.vRelationships[i].notAfter
            ) {
                continue;
            }
            vRelationshipsAux[sizeVRelationships] = d.vRelationships[i];
            sizeVRelationships++;
            bool vMethodAdded = false;
            string memory vMethodId = d.vRelationships[i].vMethodId;

            for (uint256 j = 0; j < sizeVMethods; j++) {
                if (equalStrings(vMethodId, vMethodIdsAux[j])) {
                    vMethodAdded = true;
                    break;
                }
            }
            if (!vMethodAdded) {
                vMethodIdsAux[sizeVMethods] = vMethodId;
                vMethodsAux[sizeVMethods] = d.vMethods[vMethodId];
                sizeVMethods++;
            }
        }

        for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
            if (
                block.timestamp < d.capabilityInvocations[i].notBefore ||
                block.timestamp > d.capabilityInvocations[i].notAfter
            ) {
                continue;
            }
            vRelationshipsAux[sizeVRelationships] = d.capabilityInvocations[i];
            sizeVRelationships++;
            bool vMethodAdded = false;
            string memory vMethodId = d.capabilityInvocations[i].vMethodId;

            for (uint256 j = 0; j < sizeVMethods; j++) {
                if (equalStrings(vMethodId, vMethodIdsAux[j])) {
                    vMethodAdded = true;
                    break;
                }
            }
            if (!vMethodAdded) {
                vMethodIdsAux[sizeVMethods] = vMethodId;
                vMethodsAux[sizeVMethods] = d.vMethods[vMethodId];
                sizeVMethods++;
            }
        }

        // copy auxiliar arrays to the result
        vMethodIds = new string[](sizeVMethods);
        vMethods = new DidDocumentStorage.VMethod[](sizeVMethods);
        vRelationships = new DidDocumentStorage.VRelationship[](
            sizeVRelationships
        );
        for (uint256 i = 0; i < sizeVMethods; i++) {
            vMethodIds[i] = vMethodIdsAux[i];
            vMethods[i] = vMethodsAux[i];
        }
        for (uint256 i = 0; i < sizeVRelationships; i++) {
            vRelationships[i] = vRelationshipsAux[i];
        }
    }
}
