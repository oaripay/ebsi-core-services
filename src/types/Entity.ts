import DocumentInfo from "./DocumentInfo";

export default interface Entity {
  type: string;

  moderator: string;

  documents: DocumentInfo[];

  status: boolean;
}
