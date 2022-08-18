// SPDX-License-Identifier: EUPL V1.2
// solhint-disable max-line-length

pragma solidity 0.8.12;

import "./SchemaStorage.sol";
import "./SchemaLib.sol";

contract SchemaDetailed is SchemaStorage {
    using SchemaLib for Schemas;

    event SchemaInserted(bytes indexed schemaId, bytes schema, bytes metadata);

    event SchemaUpdated(bytes indexed schema, bytes revision, bytes metadata);

    event MetadataUpdated(bytes32 indexed shemaRevisionId, bytes metadata);

    /**
     * @dev insertSchema enables to register new schema.
     */
    function insertSchema(
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        Schemas storage ss = schemaStorage();
        schemaRevisionId = ss.insertSchema(schemaId, schema, metadata);
    }

    /**
     * @dev getSchemaIds returns a paginated list of registered schema ids.
     */
    function getSchemaIds(uint256 page, uint256 pageSize)
        external
        view
        returns (
            bytes[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Schemas storage ss = schemaStorage();
        return ss.getSchemaIds(page, pageSize);
    }

    /**
     * @dev updateSchema enables to update the existing schema.
     */
    function updateSchema(
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        Schemas storage ss = schemaStorage();
        schemaRevisionId = ss.updateSchema(schemaId, schema, metadata);
    }

    /**
     * @dev updateMetadata enables to update the existing metadata.
     */
    function updateMetadata(bytes32 schemaRevisionId, bytes calldata metadata)
        external
        returns (bytes32 metadataId)
    {
        Schemas storage ss = schemaStorage();
        metadataId = ss.updateMetadata(schemaRevisionId, metadata);
    }

    /**
     * @dev getLatestSchemaRevision returns the latest schema revision by schema id.
     */
    function getLatestSchemaRevision(bytes calldata schemaId)
        external
        view
        returns (bytes memory schema)
    {
        Schemas storage ss = schemaStorage();
        schema = ss.getLatestSchemaRevision(schemaId);
    }

    /**
     * @dev getSchemaRevisionIds returns a paginated list of schema revision ids for the given schema id.
     */
    function getSchemaRevisionIds(
        bytes calldata schemaId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Schemas storage ss = schemaStorage();
        return ss.getSchemaRevisionIds(schemaId, page, pageSize);
    }

    /**
     * @dev getSchemaRevision returns a specific schema revision for a specific SchemaRevisionId.
     */
    function getSchemaRevision(bytes32 schemaRevisionId)
        external
        view
        returns (bytes memory schema)
    {
        Schemas storage ss = schemaStorage();
        schema = ss.getSchemaRevision(schemaRevisionId);
    }

    /**
     * @dev getLatestSchemaRevisionMetadataByRevisionId returns schema revision metadata for the given schema revision id.
     */
    function getLatestSchemaRevisionMetadataByRevisionId(
        bytes32 schemaRevisionId
    ) external view returns (bytes memory metadata) {
        Schemas storage ss = schemaStorage();
        metadata = ss.getLatestSchemaRevisionMetadataByRevisionId(
            schemaRevisionId
        );
    }

    /**
     * @dev getSchemaRevisionMetadataIds returns a paginated list of schema revision metadata ids, for a specific SchemaRevisionId
     */
    function getSchemaRevisionMetadataIds(
        bytes32 schemaRevisionId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        Schemas storage ss = schemaStorage();
        return
            ss.getSchemaRevisionMetadataIds(schemaRevisionId, page, pageSize);
    }

    /**
     * @dev getSchemaRevisionMetadataByMetadataId returns schema revision metadata for the given schema revision metadata id.
     */
    function getSchemaRevisionMetadataByMetadataId(bytes32 metadataId)
        external
        view
        returns (bytes memory metadata)
    {
        Schemas storage ss = schemaStorage();
        metadata = ss.getSchemaRevisionMetadataByMetadataId(metadataId);
    }
}
