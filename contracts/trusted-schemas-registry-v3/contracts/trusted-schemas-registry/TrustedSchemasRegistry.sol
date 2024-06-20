// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@ebsiint-sc/trusted-policies-registry-v3/contracts/trusted-policies-registry/interfaces/IPolicyRegistry.sol";

contract TrustedSchemasRegistry is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    IPolicyRegistry public trustedPoliciesRegistry;
    mapping(bytes => bool) public schemaExist;
    mapping(bytes32 => bool) public revisionExist;

    // Events
    event SchemaInserted(
        bytes schemaId,
        bytes32 schemaRevisionId,
        bytes32 metadataId,
        bytes schema,
        bytes metadata
    );
    event SchemaUpdated(
        bytes schemaId,
        bytes32 schemaRevisionId,
        bytes32 metadataId,
        bytes schema,
        bytes metadata
    );
    event MetadataUpdated(
        bytes32 schemaRevisionId,
        bytes32 metadataId,
        bytes metadata
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _upgraderAddress,
        address _tprAddress
    ) public initializer {
        __AccessControl_init();
        _grantRole(UPGRADER_ROLE, _upgraderAddress);
        trustedPoliciesRegistry = IPolicyRegistry(_tprAddress);
    }

    /**
     * @dev insertSchema enables to register new schema.
     */
    function insertSchema(
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        require(
            trustedPoliciesRegistry.checkPolicy("TSR:insertSchema", msg.sender),
            "Policy error: sender doesn't have the attribute TSR:insertSchema"
        );
        require(!schemaExist[schemaId], "schema exists");
        schemaRevisionId = sha256(schema);
        require(!revisionExist[schemaRevisionId], "revision exists");
        bytes32 metadataId = sha256(metadata);
        schemaExist[schemaId] = true;
        revisionExist[schemaRevisionId] = true;
        emit SchemaInserted(
            schemaId,
            schemaRevisionId,
            metadataId,
            schema,
            metadata
        );
    }

    /**
     * @dev updateSchema enables to update the existing schema.
     */
    function updateSchema(
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        require(
            trustedPoliciesRegistry.checkPolicy("TSR:updateSchema", msg.sender),
            "Policy error: sender doesn't have the attribute TSR:updateSchema"
        );
        require(schemaExist[schemaId], "schema does not exist");
        schemaRevisionId = sha256(schema);
        require(!revisionExist[schemaRevisionId], "revision exists");
        bytes32 metadataId = sha256(metadata);
        revisionExist[schemaRevisionId] = true;
        emit SchemaUpdated(
            schemaId,
            schemaRevisionId,
            metadataId,
            schema,
            metadata
        );
    }

    /**
     * @dev updateMetadata enables to update the existing metadata.
     */
    function updateMetadata(
        bytes32 schemaRevisionId,
        bytes calldata metadata
    ) external {
        require(
            trustedPoliciesRegistry.checkPolicy(
                "TSR:updateMetadata",
                msg.sender
            ),
            "Policy error: sender doesn't have the attribute TSR:updateMetadata"
        );
        require(revisionExist[schemaRevisionId], "schema does not exist");
        bytes32 metadataId = sha256(metadata);
        emit MetadataUpdated(schemaRevisionId, metadataId, metadata);
    }

    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "not upgrader");
    }
}
