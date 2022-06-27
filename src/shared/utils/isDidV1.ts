import { validate } from "@cef-ebsi/ebsi-did-resolver";

export function isDidV1(value: string): boolean {
  try {
    const didVersion = validate(value);
    return didVersion === 1;
  } catch (error) {
    return false;
  }
}

export default isDidV1;
