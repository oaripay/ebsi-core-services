import { ReactElement } from "react";
import { BigNumber } from "ethers";

export type ModalPropsType = {
  visible: boolean;
  content: ReactElement;
  title: string;
  width?: number;
  onOk?: (param?: any) => void;
  onCancel?: () => void;
};

export type DidRecordType = {
  controllerIds?: string[];
  totalDidVersions?: BigNumber;
};

export type DataType = {
  isAdministrator?: boolean;
  didControllers?: string[];
  versionHashes?: string[];
  metadata?: string[];
  timestampIds?: string[];
  administrators?: string[];
  versionInfos?: string[];
  metadataVersionIds?: string[];
  timestampsIds?: string[];
  did?: string;
  administratorLastHash?: string[];
  exists: boolean;
};

export type PropType = {
  didRecord: DidRecordType;
};

export type HashAlgo = {
  id: number;
  name: string;
};
