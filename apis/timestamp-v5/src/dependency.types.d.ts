/**
 * Fix multiformats v9 declarations
 */

declare type Multibase<Prefix extends string> =
  | string
  | (string & {
      [0]: Prefix;
    });

declare module "multiformats/basics" {
  declare namespace bases {
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
