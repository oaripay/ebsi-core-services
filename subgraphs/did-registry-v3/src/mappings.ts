import { log } from "@graphprotocol/graph-ts";

import {
  BaseDocumentUpdated,
  ControllerAdded,
  ControllerRevoked,
  DidDocumentInserted,
  VerificationMethodAdded,
  VerificationMethodExpired,
  VerificationMethodRevoked,
  VerificationMethodRolled,
  VerificationRelationshipAdded,
} from "../generated/DidRegistry/DidRegistry";
import { DidDocument } from "../generated/schema";
import {
  createControllerRelationship,
  createVerificationMethod,
  createVerificationRelationship,
  loadControllerRelationship,
  loadVerificationMethod,
  loadVerificationRelationship,
  storeEvent,
} from "./utils";

export function handleBaseDocumentUpdatedEvent(
  event: BaseDocumentUpdated,
): void {
  const did = event.params.did;

  log.info("Updating base document of DID document {}", [did]);

  const didDocument = DidDocument.load(did);

  if (didDocument === null) {
    log.error("DID document {} not found", [did]);
    return;
  }

  didDocument.baseDocument = event.params.baseDocument;
  didDocument.save();

  storeEvent(event, "UpdateBaseDocument", did);
}

export function handleControllerAddedEvent(event: ControllerAdded): void {
  const did = event.params.did;
  const controllerId = event.params.controller;

  log.info("Adding controller {} to DID document {}", [controllerId, did]);

  const controller = createControllerRelationship(did, controllerId);
  controller.save();

  storeEvent(event, "AddController", did);
}

export function handleControllerRevokedEvent(event: ControllerRevoked): void {
  const did = event.params.did;
  const controller = event.params.controller;

  log.info("Revoking controller {} of DID document {}", [controller, did]);

  const controllerRelationship = loadControllerRelationship(did, controller);

  if (controllerRelationship === null) return;

  controllerRelationship.status = "Revoked";
  controllerRelationship.save();

  storeEvent(event, "RevokeController", did);
}

export function handleDidDocumentInsertedEvent(
  event: DidDocumentInserted,
): void {
  const did = event.params.did;
  const vMethodId = event.params.vMethodId;

  log.info("Inserting DID document {}", [did]);

  const didDocument = new DidDocument(did);

  didDocument.baseDocument = event.params.baseDocument;

  const controllerRelationship = createControllerRelationship(did, did);

  controllerRelationship.save();

  const verificationMethod = createVerificationMethod(
    did,
    vMethodId,
    event.params.publicKey,
    event.params.isSecp256k1,
  );

  verificationMethod.save();

  const verificationRelationship1 = createVerificationRelationship(
    did,
    "capabilityInvocation",
    vMethodId,
    event.params.notBefore,
    event.params.notAfter,
  );

  verificationRelationship1.save();

  const verificationRelationship2 = createVerificationRelationship(
    did,
    "authentication",
    vMethodId,
    event.params.notBefore,
    event.params.notAfter,
  );

  verificationRelationship2.save();

  didDocument.save();

  storeEvent(event, "InsertDidDocument", did);
}

export function handleVerificationMethodAddedEvent(
  event: VerificationMethodAdded,
): void {
  const did = event.params.did;
  const vMethodId = event.params.vMethodId;

  log.info("Adding verification method {} to DID document {}", [
    vMethodId,
    did,
  ]);

  const verificationMethod = createVerificationMethod(
    did,
    vMethodId,
    event.params.publicKey,
    event.params.isSecp256k1,
  );

  verificationMethod.save();

  storeEvent(event, "AddVerificationMethod", did);
}

export function handleVerificationMethodExpiredEvent(
  event: VerificationMethodExpired,
): void {
  const did = event.params.did;
  const vMethodId = event.params.vMethodId;

  log.info("Expiring verification method {} of DID document {}", [
    vMethodId,
    did,
  ]);

  const verificationMethod = loadVerificationMethod(did, vMethodId);

  if (verificationMethod === null) return;

  const relationships = [
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ];

  for (let i = 0; i < relationships.length; i += 1) {
    const verificationRelationship = loadVerificationRelationship(
      did,
      relationships[i],
      vMethodId,
    );

    if (verificationRelationship) {
      verificationRelationship.notAfter = event.params.notAfter;
      verificationRelationship.save();
    }
  }

  storeEvent(event, "ExpireVerificationMethod", did);
}

export function handleVerificationMethodRevokedEvent(
  event: VerificationMethodRevoked,
): void {
  const did = event.params.did;
  const vMethodId = event.params.vMethodId;

  log.info("Revoking verification method {} of DID document {}", [
    vMethodId,
    did,
  ]);

  const verificationMethod = loadVerificationMethod(did, vMethodId);

  if (verificationMethod === null) return;

  verificationMethod.status = "Revoked";
  verificationMethod.save();

  const relationships = [
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ];

  for (let i = 0; i < relationships.length; i += 1) {
    const verificationRelationship = loadVerificationRelationship(
      did,
      relationships[i],
      vMethodId,
    );

    if (verificationRelationship) {
      verificationRelationship.notAfter = event.params.notAfter;
      verificationRelationship.save();
    }
  }

  storeEvent(event, "RevokeVerificationMethod", did);
}

export function handleVerificationMethodRolledEvent(
  event: VerificationMethodRolled,
): void {
  const did = event.params.did;
  const oldVMethodId = event.params.oldVMethodId;
  const newVMethodId = event.params.vMethodId;

  log.info("Rolling verification method from {} to {} of DID document {}", [
    oldVMethodId,
    newVMethodId,
    did,
  ]);

  // Add new verification method
  const verificationMethod = createVerificationMethod(
    did,
    newVMethodId,
    event.params.publicKey,
    event.params.isSecp256k1,
  );

  verificationMethod.save();

  // Update verification relationships
  const oldVerificationMethod = loadVerificationMethod(did, oldVMethodId);

  if (oldVerificationMethod === null) return;

  const relationships = [
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ];

  for (let i = 0; i < relationships.length; i += 1) {
    const oldVerificationRelationship = loadVerificationRelationship(
      did,
      relationships[i],
      oldVMethodId,
    );

    if (oldVerificationRelationship) {
      oldVerificationRelationship.notAfter = event.params.notBefore.plus(
        event.params.duration,
      );
      oldVerificationRelationship.save();

      const newVerificationRelationship = createVerificationRelationship(
        did,
        relationships[i],
        newVMethodId,
        event.params.notBefore,
        event.params.notAfter,
      );

      newVerificationRelationship.save();
    }
  }

  storeEvent(event, "RollVerificationMethod", did);
}

export function handleVerificationRelationshipAddedEvent(
  event: VerificationRelationshipAdded,
): void {
  const did = event.params.did;
  const vMethodName = event.params.name;
  const vMethodId = event.params.vMethodId;

  log.info(
    "Adding verification relationship {} for method {} to DID document {}",
    [vMethodName, vMethodId, did],
  );

  const verificationRelationship = createVerificationRelationship(
    did,
    vMethodName,
    vMethodId,
    event.params.notBefore,
    event.params.notAfter,
  );

  verificationRelationship.save();

  storeEvent(event, "AddVerificationRelationship", did);
}
