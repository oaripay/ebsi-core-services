import { Bytes, ethereum, store } from "@graphprotocol/graph-ts";

import {
  Creator,
  Document,
  Event,
  Invitation,
  Operator,
} from "../generated/schema";
import {
  AccessGranted,
  AccessRevoked,
  DidEbsiAuthorised,
  DocumentCreated,
  DocumentRemoved,
  EventWritten,
} from "../generated/TrackAndTrace/TrackAndTrace";

class TransactionArguments {
  args: ethereum.Tuple;

  fn: string;

  constructor() {
    this.fn = "";
    this.args = new ethereum.Tuple();
  }
}

export function handleAccessGranted(event: AccessGranted): void {
  const document = Document.load(event.params.docHash);
  if (!document) return;

  // create invitation
  const invitation = new Invitation(
    `${document.id.toHexString()}${event.params.subject.toHexString()}${
      event.params.permission
    }`,
  );
  invitation.document = document.id;
  invitation.type = getPermission(event.params.permission);
  invitation.grantedBy = event.params.signer;
  invitation.subject = event.params.subject;
  invitation.children = [];
  if (
    invitation.type == "write" &&
    invitation.grantedBy.toString() != document.creator
  ) {
    // write access granted by a delegate. Get the delegate and update the children
    const parentInvitation = Invitation.load(
      `${document.id.toHexString()}${invitation.grantedBy.toHexString()}0`,
    );
    if (parentInvitation) {
      const children = parentInvitation.children;
      children.push(invitation.id);
      parentInvitation.children = children;
      parentInvitation.save();
    }
  }
  invitation.save();

  // update operator
  let operator = Operator.load(event.params.subject);
  if (!operator) {
    operator = new Operator(event.params.subject);
    operator.invitations = [];
  }
  const invitationsOperator = operator.invitations;
  invitationsOperator.push(invitation.id);
  operator.invitations = invitationsOperator;
  operator.save();

  // update document
  const invitationsDocument = document.invitations;
  invitationsDocument.push(invitation.id);
  document.invitations = invitationsDocument;
  document.save();
}

export function handleAccessRevoked(event: AccessRevoked): void {
  const txArgs = getTransactionArguments(event);
  const permission = txArgs.args[3].toI32();

  const document = Document.load(event.params.docHash);
  if (!document) return;

  const invitation = Invitation.load(
    `${document.id.toHexString()}${event.params.subject.toHexString()}${permission}`,
  );
  if (!invitation) return;
  if (invitation.children.length > 0) {
    for (let i = 0, k = invitation.children.length; i < k; i += 1) {
      // remove children invitations from document
      document.invitations = removeItemString(
        document.invitations,
        invitation.children[i],
      );

      // update operator
      const invChild = Invitation.load(invitation.children[i]);
      if (invChild) {
        const operator = Operator.load(invChild.subject);
        if (!operator) return;
        operator.invitations = removeItemString(
          operator.invitations,
          invitation.children[i],
        );
        operator.save();
      }

      store.remove("Invitation", invitation.children[i]);
    }
  }
  // remove invitation
  document.invitations = removeItemString(document.invitations, invitation.id);
  document.save();

  // update operator
  const operator = Operator.load(event.params.subject);
  if (!operator) return;
  operator.invitations = removeItemString(operator.invitations, invitation.id);
  operator.save();

  store.remove("Invitation", invitation.id);
}

export function handleDidEbsiAuthorised(event: DidEbsiAuthorised): void {
  let creator = Creator.load(event.params.did);
  if (!creator) {
    creator = new Creator(event.params.did);
    creator.documents = [];
  }
  creator.active = event.params.val;
  creator.save();
}

export function handleDocumentCreated(event: DocumentCreated): void {
  const creatorBytes = Bytes.fromUTF8(event.params.creator);
  const document = new Document(event.params.docHash);

  const invitation = new Invitation(
    `${document.id.toHexString()}${creatorBytes.toHexString()}c`,
  );
  invitation.document = document.id;
  invitation.type = "creator";
  invitation.grantedBy = creatorBytes;
  invitation.subject = creatorBytes;
  invitation.children = [];
  invitation.save();

  document.creator = event.params.creator;
  document.timestamp = event.params.timestamp;
  document.source = getSource(event.params.source);
  document.proof = event.params.proof;
  document.metadata = event.params.metadata;
  document.events = [];
  document.invitations = [invitation.id];
  document.save();

  const creator = Creator.load(event.params.creator);
  if (!creator) return;
  const documents = creator.documents;
  documents.push(document.id);
  creator.documents = documents;
  creator.save();

  let operator = Operator.load(creatorBytes);
  if (!operator) {
    operator = new Operator(creatorBytes);
    operator.invitations = [];
  }
  const invitationsOperator = operator.invitations;
  invitationsOperator.push(invitation.id);
  operator.invitations = invitationsOperator;
  operator.save();
}

export function handleDocumentRemoved(event: DocumentRemoved): void {
  const document = Document.load(event.params.docHash);
  if (!document) return;

  // remove invitations and update operators
  for (let i = 0, k = document.invitations.length; i < k; i += 1) {
    const invitation = Invitation.load(document.invitations[i]);
    if (invitation) {
      const operator = Operator.load(invitation.subject);
      if (operator) {
        operator.invitations = removeItemString(
          operator.invitations,
          invitation.id,
        );
        operator.save();
      }
      store.remove("Invitation", invitation.id);
    }
  }

  // update creator
  const creator = Creator.load(document.creator);
  if (!creator) return;
  creator.documents = removeItemBytes(creator.documents, document.id);
  creator.save();

  // remove document
  store.remove("Document", document.id.toHexString());
}

export function handleEventWritten(event: EventWritten): void {
  const txArgs = getTransactionArguments(event);
  const externalHash = txArgs.args[0].toTuple()[1].toString();

  const document = Document.load(event.params.docHash);
  if (!document) return;
  let writeEvent = Event.load(event.params.eventHash);
  if (writeEvent) return;
  writeEvent = new Event(event.params.eventHash);
  writeEvent.hash = event.params.eventHash;
  writeEvent.externalHash = externalHash;
  writeEvent.timestamp = event.params.timestamp;
  writeEvent.source = getSource(event.params.source);
  writeEvent.proof = event.params.proof;
  writeEvent.sender = event.params.sender;
  writeEvent.origin = event.params.origin;
  writeEvent.metadata = event.params.metadata;
  writeEvent.save();

  const events = document.events;
  events.push(writeEvent.id);
  document.events = events;
  document.save();
}

function getPermission(i: i32): string {
  switch (i) {
    case 0: {
      return "delegate";
    }
    case 1: {
      return "write";
    }
    default: {
      return "write";
    }
  }
}

function getSource(i: i32): string {
  switch (i) {
    case 0: {
      return "block";
    }
    case 1: {
      return "external";
    }
    default: {
      return "external";
    }
  }
}

function getTransactionArguments(event: ethereum.Event): TransactionArguments {
  // see https://medium.com/@r2d2_68242/indexing-transaction-input-data-in-a-subgraph-6ff5c55abf20
  const fnSignatureBytes = new Bytes(4);
  fnSignatureBytes.set(event.transaction.input.slice(0, 4));
  const fnSignature = fnSignatureBytes.toU32();

  const txArgs = new TransactionArguments();
  let type = "";
  switch (fnSignature) {
    case 0x32_b9_b5_03: {
      // revokeAccess(bytes32,bytes,bytes,uint8)
      // keccak256 - 0x03b5b932
      type = "(bytes32,bytes,bytes,uint8)";
      txArgs.fn = "revokeAccess";
      break;
    }
    case 0x46_f3_92_f6: {
      // writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)
      // keccak256 - 0xf692f346
      type = "((bytes32,string,bytes,string,string),uint256,bytes32)";
      txArgs.fn = "writeEventExternalTimestamp";
      break;
    }
    case 0x79_05_37_6c: {
      // writeEvent((bytes32,string,bytes,string,string))
      // keccak256 - 0x6c370579
      type = "((bytes32,string,bytes,string,string))";
      txArgs.fn = "writeEvent";
      break;
    }
    default: {
      break;
    }
  }

  const tuplePrefix = new Bytes(32);
  tuplePrefix[31] = 0x20;
  const data = new Bytes(
    event.transaction.input.length - 4 + tuplePrefix.length,
  );
  data.set(tuplePrefix, 0);
  data.set(event.transaction.input.slice(4), 32);
  const decoded = ethereum.decode(type, data);
  txArgs.args = decoded!.toTuple();
  return txArgs;
}

function removeItemBytes(items: Bytes[], id: Bytes): Bytes[] {
  const array = items;
  for (let i = 0; i < array.length; i += 1) {
    if (array[i].toHexString() == id.toHexString()) {
      array.splice(i, 1);
      break;
    }
  }
  return array;
}

function removeItemString(items: string[], id: string): string[] {
  const array = items;
  for (let i = 0; i < array.length; i += 1) {
    if (array[i] == id) {
      array.splice(i, 1);
      break;
    }
  }
  return array;
}
