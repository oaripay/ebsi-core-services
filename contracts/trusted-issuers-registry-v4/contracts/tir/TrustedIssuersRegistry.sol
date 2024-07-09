// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@ebsiint-sc/trusted-policies-registry-v3/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";
import "@ebsiint-sc/did-registry-v3/contracts/did-registry/interfaces/IDidRegistry.sol";

contract TrustedIssuersRegistry is UUPSUpgradeable, AccessControlUpgradeable {
    enum IssuerType {
        Undefined,
        RootTAO,
        TAO,
        TI,
        Revoked
    }

    struct AttributeMetadata {
        string did;
        bytes32 attributeId;
        IssuerType issuerType;
        string taoDid;
        string rootTaoDid;
    }

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    IPolicyRegistry public trustedPoliciesRegistry;
    IDidRegistry public didRegistry;
    mapping(string => bool) public issuerExist;
    mapping(bytes32 => AttributeMetadata) public attributeMetadata;
    mapping(bytes32 => string) public proxyOwner;

    // Events
    event AttributeMetadataUpdated(
        AttributeMetadata attributeMetadata,
        bytes32 newRevisionId
    );
    event AttributeDataUpdated(
        AttributeMetadata attributeMetadata,
        bytes32 newRevisionId,
        bytes attributeData
    );
    event ProxyUpdated(string did, bytes32 proxyId, string proxyData);
    event ProxyRemoved(string did, bytes32 proxyId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _upgraderAddress,
        address _tprAddress,
        address _didRegistryAddress
    ) public initializer {
        __AccessControl_init();
        _grantRole(UPGRADER_ROLE, _upgraderAddress);
        trustedPoliciesRegistry = IPolicyRegistry(_tprAddress);
        didRegistry = IDidRegistry(_didRegistryAddress);
    }

    function setAttributeMetadata(
        string calldata did,
        bytes32 revisionId,
        IssuerType issuerType,
        string calldata taoDid,
        bytes32 attributeIdTao
    ) external {
        require(issuerType != IssuerType.Undefined, "invalid issuerType");
        AttributeMetadata storage attr = attributeMetadata[revisionId];
        bool isNewAttribute;
        bytes32 newRevisionId;
        if (bytes(attr.did).length == 0) {
            // new attribute
            isNewAttribute = true;
            attr.did = did;
            attr.attributeId = revisionId;
            newRevisionId = revisionId;
        } else {
            // update attribute
            isNewAttribute = false;
            require(
                equalStrings(attr.did, did),
                "revisionId is linked to a different did"
            );
            bytes memory seedAttributeData = abi.encode(
                block.timestamp,
                did,
                attr.attributeId
            );
            newRevisionId = sha256(seedAttributeData);
        }

        bool hasTprPolicy = trustedPoliciesRegistry.checkPolicy(
            "TIR:setAttributeMetadata",
            msg.sender
        );
        if (issuerType == IssuerType.RootTAO) {
            // RootTAO can be defined only by authorized users from Trusted Policies Registry
            require(
                hasTprPolicy,
                "Policy error: sender doesn't have the attribute TIR:setAttributeMetadata"
            );
            require(
                equalStrings(taoDid, did),
                "did and taoDid must be the same for RootTAO"
            );
            attr.rootTaoDid = did;
        } else {
            // TAO, TI, or Revoked need to verify the chain of trust or be authorized
            // in the Trusted Policies Registry
            AttributeMetadata storage taoAttr = attributeMetadata[
                attributeIdTao
            ];

            // verify the TAO exists
            require(
                taoAttr.issuerType == IssuerType.RootTAO ||
                    taoAttr.issuerType == IssuerType.TAO,
                "Policy error: attributeIdTao is not TAO/RootTao"
            );
            require(
                equalStrings(taoAttr.did, taoDid),
                "taoDid not linked with attributeIdTao"
            );

            // verify it is authorized by the TAO or by an authorized user from TPR
            require(
                hasTprPolicy ||
                    didRegistry.checkController(bytes(taoDid), msg.sender),
                string(
                    abi.encodePacked(
                        "Policy error: sender is not ",
                        taoDid,
                        " and it doesn't have the attribute TIR:setAttributeMetadata"
                    )
                )
            );

            if (!isNewAttribute) {
                // verify the chain of trust for existing attributes
                bool isTaoOfAttribute = equalStrings(attr.taoDid, taoDid);
                bool isRootTaoOfAttribute = equalStrings(
                    attr.rootTaoDid,
                    taoDid
                );
                require(
                    isTaoOfAttribute || isRootTaoOfAttribute,
                    "Policy error: taoDid is not TAO/RootTao of the current did"
                );
            }
            attr.rootTaoDid = taoAttr.rootTaoDid;
        }

        attr.taoDid = taoDid;
        attr.issuerType = issuerType;
        issuerExist[did] = true;

        emit AttributeMetadataUpdated(attr, newRevisionId);
    }

    function setAttributeData(
        string calldata did,
        bytes32 attributeId,
        bytes calldata attributeData
    ) external {
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );
        AttributeMetadata storage attr = attributeMetadata[attributeId];
        require(equalStrings(attr.did, did), "did not linked with attributeId");
        bytes32 newRevisionId = sha256(attributeData);

        emit AttributeDataUpdated(attr, newRevisionId, attributeData);
    }

    function addIssuerProxy(
        string calldata did,
        string calldata proxyData
    ) external {
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );

        bytes32 proxyId = sha256(bytes(proxyData));
        require(bytes(proxyOwner[proxyId]).length == 0, "proxy already stored");
        require(issuerExist[did], "issuer does not exist");
        proxyOwner[proxyId] = did;
        emit ProxyUpdated(did, proxyId, proxyData);
    }

    function updateIssuerProxy(
        string calldata did,
        bytes32 proxyId,
        string calldata proxyData
    ) external {
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );
        require(
            equalStrings(did, proxyOwner[proxyId]),
            "did not owner of proxyId"
        );
        emit ProxyUpdated(did, proxyId, proxyData);
    }

    function removeIssuerProxy(string calldata did, bytes32 proxyId) external {
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TIR:updateIssuer",
                msg.sender
            ) || didRegistry.checkController(bytes(did), msg.sender),
            string(
                abi.encodePacked(
                    "Policy error: sender is not controller of the did ",
                    did,
                    " and it doesn't have the attribute TIR:updateIssuer"
                )
            )
        );
        require(
            equalStrings(did, proxyOwner[proxyId]),
            "did not owner of proxyId"
        );
        proxyOwner[proxyId] = "";
        emit ProxyRemoved(did, proxyId);
    }

    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "not upgrader");
    }

    function equalStrings(
        string memory str1,
        string memory str2
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(str1)) ==
            keccak256(abi.encodePacked(str2));
    }
}
