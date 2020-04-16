import { ResponseMessageOK } from "./dto";

export interface IDocumentInfo {
  id: string;
  name: string;
  hash: string;
}

export interface IDocumentInfoList {
  list: Array<IDocumentInfo>;
}

export interface IDocumentInput {
  "@bond_id": string;
  docData: string;
  docName: string;
}

export interface IDocumentOutput extends ResponseMessageOK, IDocumentInfo {}

export interface IDocumentOutputStruct {
  docId: string;
  docName: string;
  docData: string;
}

export interface IDocStruct {
  docName: string;
  data: IDocData;
}

export interface IDocData {
  base64: string;
}
