/**
 * Fix multiformats v9 declarations
 */
declare type Multibase<Prefix extends string> =
  | string
  | (string & {
      [0]: Prefix;
    });

declare module "multiformats/bases/base58" {
  declare namespace base58btc {
    export function baseEncode(bytes: Uint8Array): string;
    export function baseDecode(text: string): Uint8Array;
    export function encode(input: Uint8Array): Multibase<"z">;
    export function decode(input: string): Uint8Array;
  }
}

declare module "multiformats/bases/base16" {
  declare namespace base16 {
    export const prefix = "f";
    export function baseEncode(bytesToEncode: Uint8Array): string;
    export function baseDecode(text: string): Uint8Array;
    export function encode(input: Uint8Array): Multibase<"f">;
    export function decode(input: string): Uint8Array;
  }
}
