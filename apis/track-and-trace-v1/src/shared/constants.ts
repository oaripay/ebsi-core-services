export const Permission = {
  DELEGATE: 0,
  WRITE: 1,
  CREATOR: 2,
} as const;

export const PermissionLabel = {
  [Permission.DELEGATE]: "delegate",
  [Permission.WRITE]: "write",
  [Permission.CREATOR]: "creator",
} as const satisfies Record<
  (typeof Permission)[keyof typeof Permission],
  string
>;

export const AccountType = {
  DID_EBSI: 0,
  DID_KEY: 1,
} as const;
