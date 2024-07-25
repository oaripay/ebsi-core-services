/**
 * Fix multiformats v9 declarations
 */

declare type Multibase<Prefix extends string> =
  | string
  | (string & {
      [0]: Prefix;
    });

declare module "multiformats/basics" {
  declare namespace bytes {
    export function toString(b: Uint8Array): string;
    export function fromHex(hex: string): Uint8Array;
    export function toHex(d: Uint8Array): string;
  }

  declare namespace bases {
    declare namespace base16 {
      export const prefix = "f";
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function baseDecode(text: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"f">;
      export function decode(input: string): Uint8Array;
    }
    declare namespace base58btc {
      export const prefix = "z";
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function baseDecode(text: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"z">;
      export function decode(input: string): Uint8Array;
    }
    declare namespace base64 {
      export const prefix = "m";
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function baseDecode(text: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"m">;
      export function decode(input: string): Uint8Array;
    }
    declare namespace base64url {
      export const prefix = "u";
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function baseDecode(text: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"u">;
      export function decode(input: string): Uint8Array;
    }
  }
}

declare module "multiformats/bases/base58" {
  declare namespace base58btc {
    export const prefix = "z";
    export function baseEncode(bytes: Uint8Array): string;
    export function baseDecode(text: string): Uint8Array;
    export function encode(input: Uint8Array): Multibase<"z">;
    export function decode(input: string): Uint8Array;
  }
}
