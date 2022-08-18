export class FileModel {
  did: string;

  hash: string;

  data: Buffer; // Blob

  metadata: string; // stringified JSON
}

export default FileModel;
