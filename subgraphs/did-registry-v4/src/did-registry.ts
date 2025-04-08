import {
  BaseDocumentUpdated,
  ControllerAdded,
  ControllerRevoked,
  DidDocumentInserted,
  VerificationMethodAdded,
  VerificationMethodRevoked,
  VerificationRelationshipAdded,
  VerificationRelationshipUpdated,
} from "../generated/DidRegistry/DidRegistry";
import {
  ControllerRelationship,
  DidDocument,
  VerificationMethod,
  VerificationRelationship,
} from "../generated/schema";
import { storeEvent } from "../utils/utils";

export function handleBaseDocumentUpdated(event: BaseDocumentUpdated): void {
  const didDocument = DidDocument.load(event.params.did);
  if (didDocument === null) return;

  didDocument.baseDocument = event.params.baseDocument;
  didDocument.save();

  storeEvent(event, "BaseDocumentUpdated", event.params.did);
}

export function handleControllerAdded(event: ControllerAdded): void {
  const controller = new ControllerRelationship(
    `${event.params.did}#${event.params.controller}`,
  );

  controller.controller = event.params.controller;
  controller.controlledDocument = event.params.did;
  controller.status = "Active";
  controller.save();

  storeEvent(event, "ControllerAdded", event.params.did);
}

export function handleControllerRevoked(event: ControllerRevoked): void {
  const controller = ControllerRelationship.load(
    `${event.params.did}#${event.params.controller}`,
  );
  if (controller === null) return;

  controller.status = "Revoked";
  controller.save();

  storeEvent(event, "ControllerRevoked", event.params.did);
}

export function handleDidDocumentInserted(event: DidDocumentInserted): void {
  const didDocument = new DidDocument(event.params.did);
  didDocument.baseDocument = event.params.baseDocument;

  const controller = new ControllerRelationship(
    `${event.params.did}#${event.params.did}`,
  );

  controller.controller = event.params.did;
  controller.controlledDocument = event.params.did;
  controller.status = "Active";
  controller.save();

  const verificationMethod = new VerificationMethod(
    `${event.params.did}#${event.params.vMethodId}`,
  );
  verificationMethod.did = event.params.did;
  verificationMethod.publicKey = event.params.publicKey;
  verificationMethod.isSecp256k1 = event.params.isSecp256k1;
  verificationMethod.status = "Active";
  verificationMethod.save();

  const verificationRelationship1 = new VerificationRelationship(
    `${event.params.did} capabilityInvocation ${event.params.vMethodId}`,
  );
  verificationRelationship1.did = event.params.did;
  verificationRelationship1.name = "capabilityInvocation";
  verificationRelationship1.vMethodId = event.params.vMethodId;
  verificationRelationship1.notBefore = event.params.notBefore;
  verificationRelationship1.notAfter = event.params.notAfter;
  verificationRelationship1.save();

  const verificationRelationship2 = new VerificationRelationship(
    `${event.params.did} authentication ${event.params.vMethodId}`,
  );
  verificationRelationship2.did = event.params.did;
  verificationRelationship2.name = "authentication";
  verificationRelationship2.vMethodId = event.params.vMethodId;
  verificationRelationship2.notBefore = event.params.notBefore;
  verificationRelationship2.notAfter = event.params.notAfter;
  verificationRelationship2.save();

  didDocument.save();

  storeEvent(event, "DidDocumentInserted", event.params.did);
}

export function handleVerificationMethodAdded(
  event: VerificationMethodAdded,
): void {
  const verificationMethod = new VerificationMethod(
    `${event.params.did}#${event.params.vMethodId}`,
  );
  verificationMethod.did = event.params.did;
  verificationMethod.publicKey = event.params.publicKey;
  verificationMethod.isSecp256k1 = event.params.isSecp256k1;
  verificationMethod.status = "Active";
  verificationMethod.save();

  storeEvent(event, "VerificationMethodAdded", event.params.did);
}

export function handleVerificationMethodRevoked(
  event: VerificationMethodRevoked,
): void {
  const verificationMethod = VerificationMethod.load(
    `${event.params.did}#${event.params.vMethodId}`,
  );
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
    const verificationRelationship = VerificationRelationship.load(
      `${event.params.did} ${relationships[i]} ${event.params.vMethodId}`,
    );
    if (verificationRelationship) {
      verificationRelationship.notAfter = event.params.notAfter;
      verificationRelationship.save();
    }
  }

  storeEvent(event, "VerificationMethodRevoked", event.params.did);
}

export function handleVerificationRelationshipAdded(
  event: VerificationRelationshipAdded,
): void {
  const verificationRelationship = new VerificationRelationship(
    `${event.params.did} ${event.params.name} ${event.params.vMethodId}`,
  );

  verificationRelationship.did = event.params.did;
  verificationRelationship.name = event.params.name;
  verificationRelationship.vMethodId = event.params.vMethodId;
  verificationRelationship.notBefore = event.params.notBefore;
  verificationRelationship.notAfter = event.params.notAfter;
  verificationRelationship.save();

  storeEvent(event, "VerificationRelationshipAdded", event.params.did);
}

export function handleVerificationRelationshipUpdated(
  event: VerificationRelationshipUpdated,
): void {
  const verificationRelationship = VerificationRelationship.load(
    `${event.params.did} ${event.params.name} ${event.params.vMethodId}`,
  );
  if (verificationRelationship === null) return;

  verificationRelationship.notAfter = event.params.notAfter;
  verificationRelationship.save();

  storeEvent(event, "VerificationRelationshipUpdated", event.params.did);
}
