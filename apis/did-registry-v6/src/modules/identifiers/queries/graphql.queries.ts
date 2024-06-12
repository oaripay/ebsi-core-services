export function getDidsQuery() {
  return /* GraphQL */ `
    query GetDids($skip: Int, $pagesize: Int) {
      didDocuments(first: $pagesize, skip: $skip) {
        baseDocument
        id
        isSecp256k1
        notBefore
        notAfter
        publicKey
        vMethodId
      }
    }
  `;
}

export function getDidsByControllerQuery() {
  return /* GraphQL */ `
    query GetDidsByController($controller: String, $skip: Int, $pagesize: Int) {
      didDocuments(
        first: $pagesize
        skip: $skip
        where: { controllers_: { controller: $controller } }
      ) {
        baseDocument
        id
        isSecp256k1
        notAfter
        notBefore
        publicKey
        vMethodId
      }
    }
  `;
}

export function getDidsByVerificationRelationshipQuery() {
  return /* GraphQL */ `
    query GetDidsByVerificationRelationship(
      $vMethodId: String
      $vRelationship: String
      $skip: Int
      $pagesize: Int
    ) {
      didDocuments(
        first: $pagesize
        skip: $skip
        where: {
          verificationRelationships_: {
            and: [{ name: $vRelationship }, { vMethodId: $vMethodId }]
          }
        }
      ) {
        baseDocument
        id
        isSecp256k1
        notAfter
        notBefore
        publicKey
        vMethodId
      }
    }
  `;
}

export function getDidsByControllerAndVerificationRelationshipQuery() {
  return /* GraphQL */ `
    query GetDidsByControllerAndVerificationRelationshipQuery(
      $controller: String
      $vMethodId: String
      $vRelationship: String
      $skip: Int
      $pagesize: Int
    ) {
      didDocuments(
        first: $pagesize
        skip: $skip
        where: {
          and: [
            { controllers_: { controller: $controller } }
            {
              verificationRelationships_: {
                and: [{ name: $vRelationship }, { vMethodId: $vMethodId }]
              }
            }
          ]
        }
      ) {
        baseDocument
        id
        isSecp256k1
        notAfter
        notBefore
        publicKey
        vMethodId
      }
    }
  `;
}

export function getDidDocumentQuery() {
  return /* GraphQL */ `
    query GetDidDocument($did: String) {
      didDocument(id: $did) {
        id
        baseDocument
        isSecp256k1
        notAfter
        notBefore
        publicKey
        vMethodId
        controllers {
          id
          controller {
            id
          }
          controlledDocument {
            id
          }
          status
        }
        verificationRelationships {
          id
          name
          vMethodId
          notBefore
          notAfter
        }
        verificationMethods {
          id
          publicKey
          isSecp256k1
          status
        }
      }
    }
  `;
}

export function getDidDocumentByTimestampQuery() {
  return /* GraphQL */ `
    query GetDidDocument($did: String, $timestamp: Int) {
      didDocument(id: $did) {
        id
        baseDocument
        isSecp256k1
        notAfter
        notBefore
        publicKey
        vMethodId
        controllers {
          id
          controller {
            id
          }
          controlledDocument {
            id
          }
          status
        }
        verificationRelationships(
          where: {
            and: [
              { did: $did }
              { notBefore_lte: $timestamp }
              { notAfter_gte: $timestamp }
            ]
          }
        ) {
          id
          name
          vMethodId
          notBefore
          notAfter
        }
        verificationMethods {
          id
          publicKey
          isSecp256k1
          status
        }
      }
    }
  `;
}

export function getDidDocumentEventsQuery() {
  return /* GraphQL */ `
    query GetDidDocumentEvents($did: String, $skip: Int, $pagesize: Int) {
      didDocument(id: $did) {
        id
        events(first: $pagesize, skip: $skip) {
          event
          signer
          timestamp
          txId
          blockNumber
        }
      }
    }
  `;
}
