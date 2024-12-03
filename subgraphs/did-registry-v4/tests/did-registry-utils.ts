import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

import {
  BaseDocumentUpdated,
  ControllerAdded,
  ControllerRevoked,
  DidDocumentInserted,
  Initialized,
  NewVersion,
  VerificationMethodAdded,
  VerificationMethodRevoked,
  VerificationMethodRolled,
  VerificationRelationshipAdded,
  VerificationRelationshipUpdated,
} from "../generated/DidRegistry/DidRegistry";

export function createBaseDocumentUpdatedEvent(
  did: string,
  baseDocument: string,
): BaseDocumentUpdated {
  const baseDocumentUpdatedEvent =
    changetype<BaseDocumentUpdated>(newMockEvent());

  baseDocumentUpdatedEvent.parameters = [];

  baseDocumentUpdatedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  baseDocumentUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "baseDocument",
      ethereum.Value.fromString(baseDocument),
    ),
  );

  return baseDocumentUpdatedEvent;
}

export function createControllerAddedEvent(
  did: string,
  controller: string,
): ControllerAdded {
  const controllerAddedEvent = changetype<ControllerAdded>(newMockEvent());

  controllerAddedEvent.parameters = [];

  controllerAddedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  controllerAddedEvent.parameters.push(
    new ethereum.EventParam(
      "controller",
      ethereum.Value.fromString(controller),
    ),
  );

  return controllerAddedEvent;
}

export function createControllerRevokedEvent(
  did: string,
  controller: string,
): ControllerRevoked {
  const controllerRevokedEvent = changetype<ControllerRevoked>(newMockEvent());

  controllerRevokedEvent.parameters = [];

  controllerRevokedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  controllerRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "controller",
      ethereum.Value.fromString(controller),
    ),
  );

  return controllerRevokedEvent;
}

export function createDidDocumentInsertedEvent(
  did: string,
  baseDocument: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
  notBefore: BigInt,
  notAfter: BigInt,
): DidDocumentInserted {
  const didDocumentInsertedEvent =
    changetype<DidDocumentInserted>(newMockEvent());

  didDocumentInsertedEvent.parameters = [];

  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam(
      "baseDocument",
      ethereum.Value.fromString(baseDocument),
    ),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam("publicKey", ethereum.Value.fromBytes(publicKey)),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam(
      "isSecp256k1",
      ethereum.Value.fromBoolean(isSecp256k1),
    ),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam(
      "notBefore",
      ethereum.Value.fromUnsignedBigInt(notBefore),
    ),
  );
  didDocumentInsertedEvent.parameters.push(
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  );

  return didDocumentInsertedEvent;
}

export function createInitializedEvent(version: i32): Initialized {
  const initializedEvent = changetype<Initialized>(newMockEvent());

  initializedEvent.parameters = [];

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(version)),
    ),
  );

  return initializedEvent;
}

export function createNewVersionEvent(param0: BigInt): NewVersion {
  const newVersionEvent = changetype<NewVersion>(newMockEvent());

  newVersionEvent.parameters = [];

  newVersionEvent.parameters.push(
    new ethereum.EventParam(
      "param0",
      ethereum.Value.fromUnsignedBigInt(param0),
    ),
  );

  return newVersionEvent;
}

export function createVerificationMethodAddedEvent(
  did: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
): VerificationMethodAdded {
  const verificationMethodAddedEvent =
    changetype<VerificationMethodAdded>(newMockEvent());

  verificationMethodAddedEvent.parameters = [];

  verificationMethodAddedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  verificationMethodAddedEvent.parameters.push(
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
  );
  verificationMethodAddedEvent.parameters.push(
    new ethereum.EventParam("publicKey", ethereum.Value.fromBytes(publicKey)),
  );
  verificationMethodAddedEvent.parameters.push(
    new ethereum.EventParam(
      "isSecp256k1",
      ethereum.Value.fromBoolean(isSecp256k1),
    ),
  );

  return verificationMethodAddedEvent;
}

export function createVerificationMethodRevokedEvent(
  did: string,
  vMethodId: string,
  notAfter: BigInt,
): VerificationMethodRevoked {
  const verificationMethodRevokedEvent =
    changetype<VerificationMethodRevoked>(newMockEvent());

  verificationMethodRevokedEvent.parameters = [];

  verificationMethodRevokedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  verificationMethodRevokedEvent.parameters.push(
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
  );
  verificationMethodRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  );

  return verificationMethodRevokedEvent;
}

export function createVerificationMethodRolledEvent(
  did: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
  notBefore: BigInt,
  notAfter: BigInt,
  oldVMethodId: string,
  duration: BigInt,
): VerificationMethodRolled {
  const verificationMethodRolledEvent =
    changetype<VerificationMethodRolled>(newMockEvent());

  verificationMethodRolledEvent.parameters = [];

  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam("publicKey", ethereum.Value.fromBytes(publicKey)),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam(
      "isSecp256k1",
      ethereum.Value.fromBoolean(isSecp256k1),
    ),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam(
      "notBefore",
      ethereum.Value.fromUnsignedBigInt(notBefore),
    ),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam(
      "oldVMethodId",
      ethereum.Value.fromString(oldVMethodId),
    ),
  );
  verificationMethodRolledEvent.parameters.push(
    new ethereum.EventParam(
      "duration",
      ethereum.Value.fromUnsignedBigInt(duration),
    ),
  );

  return verificationMethodRolledEvent;
}

export function createVerificationRelationshipAddedEvent(
  vrId: BigInt,
  did: string,
  name: string,
  vMethodId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): VerificationRelationshipAdded {
  const verificationRelationshipAddedEvent =
    changetype<VerificationRelationshipAdded>(newMockEvent());

  verificationRelationshipAddedEvent.parameters = [];

  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam("vrId", ethereum.Value.fromUnsignedBigInt(vrId)),
  );

  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
  );
  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name)),
  );
  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
  );
  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam(
      "notBefore",
      ethereum.Value.fromUnsignedBigInt(notBefore),
    ),
  );
  verificationRelationshipAddedEvent.parameters.push(
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  );

  return verificationRelationshipAddedEvent;
}

export function createVerificationRelationshipUpdatedEvent(
  vrId: BigInt,
  did: string,
  name: string,
  vMethodId: string,
  notAfter: BigInt,
): VerificationRelationshipUpdated {
  const verificationRelationshipUpdatedEvent =
    changetype<VerificationRelationshipUpdated>(newMockEvent());

  verificationRelationshipUpdatedEvent.parameters = [
    new ethereum.EventParam("vrId", ethereum.Value.fromUnsignedBigInt(vrId)),
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("name", ethereum.Value.fromString(name)),
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  ];

  return verificationRelationshipUpdatedEvent;
}
