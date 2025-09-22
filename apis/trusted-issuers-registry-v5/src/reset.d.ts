// Import ts-reset rules one by one
import "@total-typescript/ts-reset/dist/json-parse";
import "@total-typescript/ts-reset/dist/fetch";
import "@total-typescript/ts-reset/dist/filter-boolean";
import "@total-typescript/ts-reset/dist/is-array";
import "@total-typescript/ts-reset/dist/set-has";

// Note: the following rule has unexpected side effects...
// import "@total-typescript/ts-reset/dist/array-includes";
//
// Errors:
// - ../../contracts/trusted-issuers-registry-v5/src/types/common.ts:7:18 - error TS2430: Interface 'TypedEvent<TArgsArray, TArgsObject>' incorrectly extends interface 'Event'.
