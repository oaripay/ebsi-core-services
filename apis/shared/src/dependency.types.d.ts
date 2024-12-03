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
    export function fromHex(hex: string): Uint8Array;
    export function toHex(d: Uint8Array): string;
    export function toString(b: Uint8Array): string;
  }

  declare namespace bases {
    declare namespace base16 {
      export const prefix = "f";
      export function baseDecode(text: string): Uint8Array;
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function decode(input: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"f">;
    }
    declare namespace base58btc {
      export const prefix = "z";
      export function baseDecode(text: string): Uint8Array;
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function decode(input: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"z">;
    }
    declare namespace base64 {
      export const prefix = "m";
      export function baseDecode(text: string): Uint8Array;
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function decode(input: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"m">;
    }
    declare namespace base64url {
      export const prefix = "u";
      export function baseDecode(text: string): Uint8Array;
      export function baseEncode(bytesToEncode: Uint8Array): string;
      export function decode(input: string): Uint8Array;
      export function encode(input: Uint8Array): Multibase<"u">;
    }
  }
}

declare module "multiformats/bases/base58" {
  declare namespace base58btc {
    export const prefix = "z";
    export function baseDecode(text: string): Uint8Array;
    export function baseEncode(bytes: Uint8Array): string;
    export function decode(input: string): Uint8Array;
    export function encode(input: Uint8Array): Multibase<"z">;
  }
}
