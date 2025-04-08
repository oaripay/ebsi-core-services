import { log } from "@graphprotocol/graph-ts";

import {
  AddControllerCall,
  AddVerificationMethodCall,
  AddVerificationRelationshipCall,
  ExpireVerificationMethodCall,
  InsertDidDocumentCall,
  RevokeControllerCall,
  RevokeVerificationMethodCall,
  RollVerificationMethodCall,
  UpdateBaseDocumentCall,
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

export function handleAddControllerCall(call: AddControllerCall): void {
  const did = call.inputs.did;
  const controllerId = call.inputs.controller;

  log.info("Adding controller {} to DID document {}", [controllerId, did]);

  const controller = createControllerRelationship(did, controllerId);
  controller.save();

  storeEvent(call, "AddController", did);
}

export function handleAddVerificationMethodCall(
  call: AddVerificationMethodCall,
): void {
  const did = call.inputs.did;
  const vMethodId = call.inputs.vMethodId;

  log.info("Adding verification method {} to DID document {}", [
    vMethodId,
    did,
  ]);

  const verificationMethod = createVerificationMethod(
    did,
    vMethodId,
    call.inputs.publicKey,
    call.inputs.isSecp256k1,
  );

  verificationMethod.save();

  storeEvent(call, "AddVerificationMethod", did);
}

export function handleAddVerificationRelationshipCall(
  call: AddVerificationRelationshipCall,
): void {
  const did = call.inputs.did;
  const vMethodName = call.inputs.name;
  const vMethodId = call.inputs.vMethodId;

  log.info(
    "Adding verification relationship {} for method {} to DID document {}",
    [vMethodName, vMethodId, did],
  );

  const verificationRelationship = createVerificationRelationship(
    did,
    vMethodName,
    vMethodId,
    call.inputs.notBefore,
    call.inputs.notAfter,
  );

  verificationRelationship.save();

  storeEvent(call, "AddVerificationRelationship", did);
}

export function handleExpireVerificationMethodCall(
  call: ExpireVerificationMethodCall,
): void {
  const did = call.inputs.did;
  const vMethodId = call.inputs.vMethodId;

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
      verificationRelationship.notAfter = call.inputs.notAfter;
      verificationRelationship.save();
    }
  }

  storeEvent(call, "ExpireVerificationMethod", did);
}

export function handleInsertDidDocumentCall(call: InsertDidDocumentCall): void {
  const did = call.inputs.did;
  const vMethodId = call.inputs.vMethodId;

  log.info("Inserting DID document {}", [did]);

  const didDocument = new DidDocument(did);

  didDocument.baseDocument = call.inputs.baseDocument;

  const controllerRelationship = createControllerRelationship(did, did);

  controllerRelationship.save();

  const verificationMethod = createVerificationMethod(
    did,
    vMethodId,
    call.inputs.publicKey,
    call.inputs.isSecp256k1,
  );

  verificationMethod.save();

  const verificationRelationship1 = createVerificationRelationship(
    did,
    "capabilityInvocation",
    vMethodId,
    call.inputs.notBefore,
    call.inputs.notAfter,
  );

  verificationRelationship1.save();

  const verificationRelationship2 = createVerificationRelationship(
    did,
    "authentication",
    vMethodId,
    call.inputs.notBefore,
    call.inputs.notAfter,
  );

  verificationRelationship2.save();

  didDocument.save();

  storeEvent(call, "InsertDidDocument", did);
}

export function handleRevokeControllerCall(call: RevokeControllerCall): void {
  const did = call.inputs.did;
  const controller = call.inputs.controller;

  log.info("Revoking controller {} of DID document {}", [controller, did]);

  const controllerRelationship = loadControllerRelationship(did, controller);

  if (controllerRelationship === null) return;

  controllerRelationship.status = "Revoked";
  controllerRelationship.save();

  storeEvent(call, "RevokeController", did);
}

export function handleRevokeVerificationMethodCall(
  call: RevokeVerificationMethodCall,
): void {
  const did = call.inputs.did;
  const vMethodId = call.inputs.vMethodId;

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
      verificationRelationship.notAfter = call.inputs.notAfter;
      verificationRelationship.save();
    }
  }

  storeEvent(call, "RevokeVerificationMethod", did);
}

export function handleRollVerificationMethodCall(
  call: RollVerificationMethodCall,
): void {
  const did = call.inputs.args.did;
  const oldVMethodId = call.inputs.args.oldVMethodId;
  const newVMethodId = call.inputs.args.vMethodId;

  log.info("Rolling verification method from {} to {} of DID document {}", [
    oldVMethodId,
    newVMethodId,
    did,
  ]);

  // Add new verification method
  const verificationMethod = createVerificationMethod(
    did,
    newVMethodId,
    call.inputs.args.publicKey,
    call.inputs.args.isSecp256k1,
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
      oldVerificationRelationship.notAfter = call.inputs.args.notBefore.plus(
        call.inputs.args.duration,
      );
      oldVerificationRelationship.save();

      const newVerificationRelationship = createVerificationRelationship(
        did,
        relationships[i],
        newVMethodId,
        call.inputs.args.notBefore,
        call.inputs.args.notAfter,
      );

      newVerificationRelationship.save();
    }
  }

  storeEvent(call, "RollVerificationMethod", did);
}

export function handleUpdateBaseDocumentCall(
  call: UpdateBaseDocumentCall,
): void {
  const did = call.inputs.did;

  log.info("Updating base document of DID document {}", [did]);

  const didDocument = DidDocument.load(did);

  if (didDocument === null) return;

  didDocument.baseDocument = call.inputs.baseDocument;
  didDocument.save();

  storeEvent(call, "UpdateBaseDocument", did);
}
