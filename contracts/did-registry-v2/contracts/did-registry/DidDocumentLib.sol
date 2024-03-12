// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol";
import "./DidDocumentStorage.sol";
import "./VRelationshipsStorage.sol";
import "./VRelationshipsLib.sol";

library DidDocumentLib {
    using Pagination for string[];
    using VRelationshipsLib for VRelationshipsStorage.VRelationships;

    function equalStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        if (abi.encodePacked(a).length != abi.encodePacked(b).length) {
            return false;
        }
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function getAddress(
        bytes storage publicKey
    ) internal view returns (address) {
        return
            address(uint160(uint256(keccak256(sanitizePublicKey(publicKey)))));
    }

    function sanitizePublicKey(
        bytes memory publicKey
    ) internal pure returns (bytes memory) {
        if (publicKey.length == 65) {
            require(publicKey[0] == 0x04, "Invalid control byte");
            /**
             * step 1: EC public key prefix (04)
             * Note: We can not use the built-in array slices (like publicKey[1:])
             * because it is only for calldata arrays, not storage arrays.
             * Then we have to use a loop to make the slice
             */
            bytes memory publicKeyWithoutPrefix = new bytes(
                publicKey.length - 1
            );
            for (uint256 i = 1; i < publicKey.length; i++) {
                publicKeyWithoutPrefix[i - 1] = publicKey[i];
            }
            return publicKeyWithoutPrefix;
        } else if (publicKey.length == 64) {
            return publicKey;
        } else {
            revert("Invalid public key length");
        }
    }

    function checkController(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        address controller
    ) public view returns (bool) {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];

        // check did exist
        require(bytes(d.baseDocument).length > 0, "did doesn't exist");

        // check all controllers
        for (uint256 i = 0; i < d.controllers.length; i++) {
            // get DID document of the controller
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
                    getAddress(vMethod.publicKey) == controller
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    modifier onlyControllerOrAuth(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        string memory tprAttribute
    ) {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];

        // check did exist
        require(bytes(d.baseDocument).length > 0, "did doesn't exist");

        bool isController = checkController(ds, did, msg.sender);

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
        VRelationshipsStorage.VRelationships storage vs,
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

        require(bytes(d.baseDocument).length == 0, "did already exists");

        d.baseDocument = baseDocument;
        d.controllers.push(did);
        d.vMethods[vMethodId] = DidDocumentStorage.VMethod(
            publicKey,
            true,
            false
        );

        uint256 indexDid;

        indexDid = _addVerificationRelationship(
            vs,
            "capabilityInvocation",
            vMethodId,
            did,
            notBefore,
            notAfter
        );
        d.capabilityInvocations.push(
            DidDocumentStorage.VRelationship(
                "capabilityInvocation",
                vMethodId,
                notBefore,
                notAfter,
                indexDid
            )
        );

        indexDid = _addVerificationRelationship(
            vs,
            "authentication",
            vMethodId,
            did,
            notBefore,
            notAfter
        );

        d.vRelationships.push(
            DidDocumentStorage.VRelationship(
                "authentication",
                vMethodId,
                notBefore,
                notAfter,
                indexDid
            )
        );

        ds.dids.push(did);
        return true;
    }

    function _addVerificationRelationship(
        VRelationshipsStorage.VRelationships storage vs,
        string memory str,
        string memory vMethodId,
        string memory did,
        uint notBefore,
        uint notAfter
    ) internal returns (uint) {
        return
            vs.addVerificationRelationship(
                uint256(keccak256(abi.encodePacked(str, vMethodId))),
                did,
                notBefore,
                notAfter
            );
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
                d.controllers[i] = d.controllers[d.controllers.length - 1];
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
            "vMethodId already exists"
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
        VRelationshipsStorage.VRelationships storage vs,
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

        uint256 indexDid = vs.addVerificationRelationship(
            uint256(keccak256(abi.encodePacked(name, vMethodId))),
            did,
            notBefore,
            notAfter
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
                    "capabilityInvocation already exists"
                );
            }

            d.capabilityInvocations.push(
                DidDocumentStorage.VRelationship(
                    "capabilityInvocation",
                    vMethodId,
                    notBefore,
                    notAfter,
                    indexDid
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
                    "relationship already exists"
                );
            }

            d.vRelationships.push(
                DidDocumentStorage.VRelationship(
                    name,
                    vMethodId,
                    notBefore,
                    notAfter,
                    indexDid
                )
            );
        }
        return true;
    }

    function revokeVerificationMethod(
        DidDocumentStorage.DidDocuments storage ds,
        VRelationshipsStorage.VRelationships storage vs,
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
        require(!d.vMethods[vMethodId].revoked, "vMethodId already revoked");

        for (uint256 i = 0; i < d.vRelationships.length; i++) {
            if (equalStrings(vMethodId, d.vRelationships[i].vMethodId)) {
                d.vRelationships[i].notAfter = notAfter;
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                d.vRelationships[i].name,
                                vMethodId
                            )
                        )
                    ),
                    d.vRelationships[i].indexDid,
                    notAfter
                );
            }
        }

        for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
            if (equalStrings(vMethodId, d.capabilityInvocations[i].vMethodId)) {
                d.capabilityInvocations[i].notAfter = notAfter;
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked("capabilityInvocation", vMethodId)
                        )
                    ),
                    d.capabilityInvocations[i].indexDid,
                    notAfter
                );
            }
        }

        d.vMethods[vMethodId].revoked = true;

        return true;
    }

    function expireVerificationMethod(
        DidDocumentStorage.DidDocuments storage ds,
        VRelationshipsStorage.VRelationships storage vs,
        string memory did,
        string memory vMethodId,
        uint256 notAfter
    )
        external
        onlyControllerOrAuth(ds, did, "DID:expireVerificationMethod")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[did];
        require(notAfter > block.timestamp, "invalid notAfter");
        require(
            d.vMethods[vMethodId].publicKey.length > 0,
            "vMethodId doesn't exist"
        );
        require(!d.vMethods[vMethodId].revoked, "vMethodId already revoked");

        for (uint256 i = 0; i < d.vRelationships.length; i++) {
            if (equalStrings(vMethodId, d.vRelationships[i].vMethodId)) {
                d.vRelationships[i].notAfter = notAfter;
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                d.vRelationships[i].name,
                                vMethodId
                            )
                        )
                    ),
                    d.vRelationships[i].indexDid,
                    notAfter
                );
            }
        }

        for (uint256 i = 0; i < d.capabilityInvocations.length; i++) {
            if (equalStrings(vMethodId, d.capabilityInvocations[i].vMethodId)) {
                d.capabilityInvocations[i].notAfter = notAfter;
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked("capabilityInvocation", vMethodId)
                        )
                    ),
                    d.capabilityInvocations[i].indexDid,
                    notAfter
                );
            }
        }

        return true;
    }

    function rollVerificationMethod(
        DidDocumentStorage.DidDocuments storage ds,
        VRelationshipsStorage.VRelationships storage vs,
        DidDocumentStorage.RollArgs memory args
    )
        external
        onlyControllerOrAuth(ds, args.did, "DID:rollVerificationMethod")
        returns (bool)
    {
        DidDocumentStorage.DidDocument storage d = ds.didList[args.did];
        require(bytes(args.vMethodId).length > 0, "invalid vMethodId");
        require(args.publicKey.length > 0, "invalid publicKey");
        require(
            d.vMethods[args.vMethodId].publicKey.length == 0,
            "vMethodId already exists"
        );
        require(
            d.vMethods[args.oldVMethodId].publicKey.length > 0,
            "oldVMethodId doesn't exist"
        );
        require(
            args.notAfter == 0 || args.notBefore <= args.notAfter,
            "invalid dates"
        );

        // add new verification method
        d.vMethods[args.vMethodId] = DidDocumentStorage.VMethod(
            args.publicKey,
            args.isSecp256k1,
            false
        );

        uint256 sizeVRelationships = d.vRelationships.length;
        uint256 sizeCapabilityInvocations = d.capabilityInvocations.length;

        for (uint256 i = 0; i < sizeVRelationships; i++) {
            if (
                equalStrings(args.oldVMethodId, d.vRelationships[i].vMethodId)
            ) {
                // update the previous relationship
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                d.vRelationships[i].name,
                                args.oldVMethodId
                            )
                        )
                    ),
                    d.vRelationships[i].indexDid,
                    args.notBefore + args.duration
                );
                d.vRelationships[i].notAfter = args.notBefore + args.duration;

                // add the new relationship
                uint256 indexDid = vs.addVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                d.vRelationships[i].name,
                                args.vMethodId
                            )
                        )
                    ),
                    args.did,
                    args.notBefore,
                    args.notAfter
                );
                d.vRelationships.push(
                    DidDocumentStorage.VRelationship(
                        d.vRelationships[i].name,
                        args.vMethodId,
                        args.notBefore,
                        args.notAfter,
                        indexDid
                    )
                );
            }
        }

        for (uint256 i = 0; i < sizeCapabilityInvocations; i++) {
            if (
                equalStrings(
                    args.oldVMethodId,
                    d.capabilityInvocations[i].vMethodId
                )
            ) {
                // update the previous relationship
                vs.updateVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                "capabilityInvocation",
                                args.oldVMethodId
                            )
                        )
                    ),
                    d.capabilityInvocations[i].indexDid,
                    args.notBefore + args.duration
                );
                d.capabilityInvocations[i].notAfter =
                    args.notBefore +
                    args.duration;

                // add the new relationship
                uint256 indexDid = vs.addVerificationRelationship(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                "capabilityInvocation",
                                args.vMethodId
                            )
                        )
                    ),
                    args.did,
                    args.notBefore,
                    args.notAfter
                );
                d.capabilityInvocations.push(
                    DidDocumentStorage.VRelationship(
                        "capabilityInvocation",
                        args.vMethodId,
                        args.notBefore,
                        args.notAfter,
                        indexDid
                    )
                );
            }
        }

        return true;
    }

    function getDids(
        DidDocumentStorage.DidDocuments storage ds,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "pageSize must be <= 50");
        return ds.dids.paginate(page, pageSize);
    }

    function getDidDocumentByTimestamp(
        DidDocumentStorage.DidDocuments storage ds,
        string memory did,
        uint256 timestamp
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
                timestamp < d.vRelationships[i].notBefore ||
                timestamp > d.vRelationships[i].notAfter
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
                timestamp < d.capabilityInvocations[i].notBefore ||
                timestamp > d.capabilityInvocations[i].notAfter
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
