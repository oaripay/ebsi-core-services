export interface PostFileResponseObject {
  hash: string;
  function: string;
}

export interface FileMetadata {
  filename?: string;
  mimetype?: string;
  encoding?: string;
  [x: string]: unknown;
}
