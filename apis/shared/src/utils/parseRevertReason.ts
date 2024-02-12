export function parseRevertReason(revertReason: string): string {
  // Try to clean the revert reason (only keep the string data)
  // See https://besu.hyperledger.org/private-networks/how-to/send-transactions/revert-reason#revert-reason-format
  const cleanerRevertReason = Buffer.from(revertReason.substring(138), "hex")
    .toString()
    .replace(/[^a-zA-Z0-9:'. ]/g, "");

  if (cleanerRevertReason) {
    return cleanerRevertReason;
  }

  return revertReason;
}

export default parseRevertReason;
