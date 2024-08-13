export interface Access {
  /**
   * A `did:ebsi` or `did:key` DID.
   */
  subject: string;

  /**
   * Document ID
   */
  documentId: string;

  /**
   * Permission granted: "write", "delegate" or "creator".
   */
  permission: "write" | "delegate" | "creator";

  /**
   * The `did:ebsi` or `did:key` DID of the granter of the permission.
   * "creator" shall have itself as "grantedBy".
   */
  grantedBy: string;
}

export default Access;
