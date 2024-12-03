import { store } from "@graphprotocol/graph-ts";

import { Attribute, Issuer, Proxy, Revision } from "../generated/schema";
import {
  AttributeDataUpdated,
  AttributeMetadataUpdated,
  ProxyRemoved,
  ProxyUpdated,
} from "../generated/TrustedIssuersRegistry/TrustedIssuersRegistry";

export function handleAttributeDataUpdated(event: AttributeDataUpdated): void {
  const attribute = Attribute.load(event.params.attributeMetadata.attributeId);
  if (!attribute) return;

  const revision = new Revision(event.params.newRevisionId);

  attribute.lastRevision = revision.id;
  const revisions = attribute.revisions;
  revisions.push(revision.id);
  attribute.revisions = revisions;
  attribute.save();

  revision.issuerType = getIssuerType(
    event.params.attributeMetadata.issuerType,
  );
  revision.tao = event.params.attributeMetadata.taoDid;
  revision.rootTao = event.params.attributeMetadata.rootTaoDid;
  revision.data = event.params.attributeData.toString();
  revision.save();
}

export function handleAttributeMetadataUpdated(
  event: AttributeMetadataUpdated,
): void {
  let issuer = Issuer.load(event.params.attributeMetadata.did);
  if (!issuer) {
    // new issuer
    issuer = new Issuer(event.params.attributeMetadata.did);
    issuer.attributes = [];
    issuer.proxies = [];
  }
  let attribute = Attribute.load(event.params.attributeMetadata.attributeId);
  if (!attribute) {
    // new attribute
    attribute = new Attribute(event.params.attributeMetadata.attributeId);
    attribute.revisions = [];

    const attributes = issuer.attributes;
    attributes.push(attribute.id);
    issuer.attributes = attributes;
    issuer.save();
  }

  const revision = new Revision(event.params.newRevisionId);

  attribute.lastRevision = revision.id;
  const revisions = attribute.revisions;
  revisions.push(revision.id);
  attribute.revisions = revisions;
  attribute.save();

  revision.issuerType = getIssuerType(
    event.params.attributeMetadata.issuerType,
  );
  revision.tao = event.params.attributeMetadata.taoDid;
  revision.rootTao = event.params.attributeMetadata.rootTaoDid;
  revision.data = "";
  revision.save();
}

export function handleProxyRemoved(event: ProxyRemoved): void {
  const issuer = Issuer.load(event.params.did);
  if (!issuer) return;

  const proxies = issuer.proxies;
  for (let i = 0; i < proxies.length; i += 1) {
    if (proxies[i].toHexString() == event.params.proxyId.toHexString()) {
      proxies.splice(i, 1);
      break;
    }
  }
  issuer.proxies = proxies;
  issuer.save();

  store.remove("Proxy", event.params.proxyId.toHexString());
}

export function handleProxyUpdated(event: ProxyUpdated): void {
  const issuer = Issuer.load(event.params.did);
  if (!issuer) return;

  let proxy = Proxy.load(event.params.proxyId);
  if (!proxy) {
    // new proxy
    proxy = new Proxy(event.params.proxyId);
    const proxies = issuer.proxies;
    proxies.push(proxy.id);
    issuer.proxies = proxies;
    issuer.save();
  }

  proxy.data = event.params.proxyData;
  proxy.save();
}

function getIssuerType(i: i32): string {
  switch (i) {
    case 0: {
      return "Undefined";
    }
    case 1: {
      return "RootTAO";
    }
    case 2: {
      return "TAO";
    }
    case 3: {
      return "TI";
    }
    case 4: {
      return "Revoked";
    }
    default: {
      return "Undefined";
    }
  }
}
