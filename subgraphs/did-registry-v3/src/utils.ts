import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import {
  ControllerRelationship,
  Event,
  VerificationMethod,
  VerificationRelationship,
} from "../generated/schema";

export const computeEventId = (
  call: ethereum.Call,
  eventName: string,
  did: string,
): Bytes => {
  return Bytes.fromUTF8(
    `${call.transaction.hash.toHexString()}-${eventName}-${did}`,
  );
};

export const storeEvent = (
  call: ethereum.Call,
  eventName: string,
  did: string,
): void => {
  const event = new Event(computeEventId(call, eventName, did));

  event.did = did;
  event.signer = call.transaction.from;
  event.blockNumber = call.block.number;
  event.timestamp = call.block.timestamp;
  event.event = eventName;
  event.txId = call.transaction.hash;

  event.save();
};

export function createControllerRelationship(
  did: string,
  controller: string,
): ControllerRelationship {
  const controllerRelationship = new ControllerRelationship(
    `${did}#${controller}`,
  );

  controllerRelationship.controller = controller;
  controllerRelationship.controlledDocument = did;
  controllerRelationship.status = "Active";

  return controllerRelationship;
}

export function createVerificationMethod(
  did: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
): VerificationMethod {
  const verificationMethod = new VerificationMethod(`${did}#${vMethodId}`);

  verificationMethod.did = did;
  verificationMethod.publicKey = publicKey;
  verificationMethod.isSecp256k1 = isSecp256k1;
  verificationMethod.status = "Active";

  return verificationMethod;
}

export function createVerificationRelationship(
  did: string,
  vMethodName: string,
  vMethodId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): VerificationRelationship {
  const verificationRelationship = new VerificationRelationship(
    `${did} ${vMethodName} ${vMethodId}`,
  );

  verificationRelationship.did = did;
  verificationRelationship.name = vMethodName;
  verificationRelationship.vMethodId = vMethodId;
  verificationRelationship.notBefore = notBefore;
  verificationRelationship.notAfter = notAfter;

  return verificationRelationship;
}

export function loadControllerRelationship(
  did: string,
  controller: string,
): ControllerRelationship | null {
  return ControllerRelationship.load(`${did}#${controller}`);
}

export function loadVerificationMethod(
  did: string,
  vMethodId: string,
  // If we put "null" first, Matchstick won't be able to compile
  // eslint-disable-next-line perfectionist/sort-union-types
): VerificationMethod | null {
  return VerificationMethod.load(`${did}#${vMethodId}`);
}

export function loadVerificationRelationship(
  did: string,
  vMethodName: string,
  vMethodId: string,
  // If we put "null" first, Matchstick won't be able to compile
  // eslint-disable-next-line perfectionist/sort-union-types
): VerificationRelationship | null {
  return VerificationRelationship.load(`${did} ${vMethodName} ${vMethodId}`);
}
