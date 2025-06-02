// SPDX-License-Identifier: EUPL V1.2

pragma solidity 0.8.12;

import "./SchemaStorage.sol";

library SchemaLib {
    event SchemaInserted(
        bytes indexed schemaId,
        bytes schema,
        bytes32 schemaRevisionId,
        bytes metadata,
        bytes32 metadataId
    );

    event SchemaUpdated(
        bytes indexed schemaId,
        bytes schema,
        bytes32 schemaRevisionId,
        bytes metadata,
        bytes32 metadataId
    );

    event MetadataUpdated(
        bytes32 indexed schemaRevisionId,
        bytes metadata,
        bytes32 metadataId
    );

    /**
     * @dev insertSchema enables to register new schema.
     */
    function insertSchema(
        SchemaStorage.Schemas storage ss,
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        require(schemaId.length > 0, "schema empty");
        require(schema.length > 0, "revision empty");
        require(metadata.length > 0, "metadata empty");

        schemaRevisionId = sha256(schema);

        // Verify that the schema ID is not already registered (in the Schema ID To Schema Revisions IDs map)
        require(
            ss.schemaIdToRevisionIds[schemaId].length == 0,
            "Schema already registered"
        );

        // Compute the SHA2-256 hash of the schema and verify
        // that is not already registered (in the Schema Revisions Store)
        require(
            (ss.schemaRevisionStore[schemaRevisionId]).length == 0,
            "Revision already exist."
        );

        // add schema id to the list
        ss.schemaIds.push(schemaId);
        // add revision id to the list of schema
        ss.schemaIdToRevisionIds[schemaId].push(schemaRevisionId);
        bytes32 metadataId = sha256(metadata);
        {
            // add metadataId to the current revisionId
            ss.revisionIdToMetadataIds[schemaRevisionId].push(metadataId);
            // save metadata of revision
            if (ss.revisionMetadataStore[metadataId].length == 0) {
                ss.revisionMetadataStore[metadataId] = metadata;
            }
        }

        // save schema revision (bytes)
        ss.schemaRevisionStore[schemaRevisionId] = schema;

        emit SchemaInserted(
            schemaId,
            schema,
            schemaRevisionId,
            metadata,
            metadataId
        );
    }

    /**
     * @dev getLatestSchemaRevision returns the latest schema revision by schema id.
     */
    function getLatestSchemaRevision(
        SchemaStorage.Schemas storage ss,
        bytes calldata schemaId
    ) external view returns (bytes memory schemaRevision) {
        require(schemaId.length > 0, "schemaId empty");
        require(
            ss.schemaIdToRevisionIds[schemaId].length > 0,
            "Schema not found"
        );
        bytes32 latestSchemaRevisionId = ss.schemaIdToRevisionIds[schemaId][
            ss.schemaIdToRevisionIds[schemaId].length - 1
        ];
        schemaRevision = ss.schemaRevisionStore[latestSchemaRevisionId];
    }

    /**
     * @dev getLatestSchemaRevisionMetadataByRevisionId returns schema revision metadata for
     * the given schema revision id.
     */
    function getLatestSchemaRevisionMetadataByRevisionId(
        SchemaStorage.Schemas storage ss,
        bytes32 schemaRevisionId
    ) external view returns (bytes memory metadata) {
        require(schemaRevisionId != bytes32(0), "SchemaRevisionId empty");
        bytes32[] storage metadataIds = ss.revisionIdToMetadataIds[
            schemaRevisionId
        ];
        require(metadataIds.length > 0, "No metadata");

        metadata = ss.revisionMetadataStore[
            metadataIds[metadataIds.length - 1]
        ];
    }

    /**
     * @dev updateSchema enables to update the existing schema.
     */
    function updateSchema(
        SchemaStorage.Schemas storage ss,
        bytes calldata schemaId,
        bytes calldata schema,
        bytes calldata metadata
    ) external returns (bytes32 schemaRevisionId) {
        require(schemaId.length > 0, "schema empty");
        require(schema.length > 0, "revision empty");
        require(metadata.length > 0, "metadata empty");

        schemaRevisionId = sha256(schema);
        bytes32 metadataId = sha256(metadata);

        // Verify that the schema ID is already registered (in the Schema ID To Schema Revisions IDs map)
        require(
            ss.schemaIdToRevisionIds[schemaId].length > 0,
            "Schema not registered"
        );
        // Compute the SHA2-256 hash of the schema and verify
        // that is not already registered (in the Schema Revisions Store)
        require(
            (ss.schemaRevisionStore[schemaRevisionId]).length == 0,
            "Revision exist"
        );

        require(
            ss.revisionMetadataStore[metadataId].length == 0,
            "Metadata exists"
        );

        // Insert the schema to the Schema Revisions Store
        ss.schemaRevisionStore[schemaRevisionId] = schema;

        // Append a new entry in the Schema ID to Schema Revisions IDs map
        ss.schemaIdToRevisionIds[schemaId].push(schemaRevisionId);
        // Store the metadata to the Metadata Store
        ss.revisionMetadataStore[metadataId] = metadata;

        // Append a new entry in the Schema Revision ID to Metadata IDs store.
        ss.revisionIdToMetadataIds[schemaRevisionId].push(metadataId);

        emit SchemaUpdated(
            schemaId,
            schema,
            schemaRevisionId,
            metadata,
            metadataId
        );
    }

    /**
     * @dev updateMetadata enables to update the existing metadata.
     */
    function updateMetadata(
        SchemaStorage.Schemas storage ss,
        bytes32 schemaRevisionId,
        bytes calldata metadata
    ) external returns (bytes32 metadataId) {
        require(schemaRevisionId != bytes32(0), "schemaRevisionId empty");
        require(metadata.length > 0, "metadata empty");
        // Verify that the Schema Revision ID is already registered (in the Schema Revision ID To Metadata IDs map)
        require(
            ss.revisionIdToMetadataIds[schemaRevisionId].length > 0,
            "schema not registered"
        );

        // Compute the SHA2-256 hash of the metadata
        metadataId = sha256(metadata);

        require(
            ss.revisionMetadataStore[metadataId].length == 0,
            "Metadata exists"
        );

        // Store the metadata to the Metadata Store
        ss.revisionMetadataStore[metadataId] = metadata;

        // Append a new entry in the Schema Revision ID to Metadata IDs store.
        ss.revisionIdToMetadataIds[schemaRevisionId].push(metadataId);

        emit MetadataUpdated(schemaRevisionId, metadata, metadataId);
    }

    /**
     * @dev getSchemaRevision returns a specific schema revision for a specific SchemaRevisionId.
     */
    function getSchemaRevision(
        SchemaStorage.Schemas storage ss,
        bytes calldata schemaId,
        bytes32 schemaRevisionId
    ) external view returns (bytes memory schema) {
        require(
            ss.schemaIdToRevisionIds[schemaId].length > 0,
            "Schema not found"
        );
        require(schemaRevisionId != bytes32(0), "SchemaRevisionId empty");
        require(
            ss.schemaRevisionStore[schemaRevisionId].length > 0,
            "No revision"
        );

        schema = ss.schemaRevisionStore[schemaRevisionId];
    }

    /**
     * @dev getSchemaRevisionMetadataByMetadataId returns schema revision metadata
     * for the given schema revision metadata id.
     */
    function getSchemaRevisionMetadataByMetadataId(
        SchemaStorage.Schemas storage ss,
        bytes calldata schemaId,
        bytes32 schemaRevisionId,
        bytes32 metadataId
    ) external view returns (bytes memory metadata) {
        require(
            ss.schemaIdToRevisionIds[schemaId].length > 0,
            "Schema not found"
        );
        require(
            ss.schemaRevisionStore[schemaRevisionId].length > 0,
            "No revision"
        );
        require(metadataId != bytes32(0), "MetadataId empty");
        require(ss.revisionMetadataStore[metadataId].length > 0, "No metadata");
        metadata = ss.revisionMetadataStore[metadataId];
    }
}
