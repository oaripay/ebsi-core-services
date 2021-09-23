import { ReactElement } from "react";
import { BigNumber } from "ethers";

export type ModalPropsType = {
  visible: boolean;
  content: ReactElement;
  title: string;
  width: number;
  onOk?: (param?: any) => void;
};

export type DataType = {
  didControllers?: string[];
  versionHashes?: string[];
  metadata?: string[];
  timestampIds?: string[];
  administrators?: string[];
  versionInfos?: string[];
  metadataVersionIds?: string[];
  timestampsIds?: string[];
}[];

export type PropType = {
  didRecord: any;
};

export type PaginatedResponse = {
  howMany: BigNumber;
  items: string[];
};

export type HashAlgo = {
  id: number;
  name: string;
};

export type DidTableEffectsPropType = {
  setDidControllers: (didControllers: string[]) => void;
  setVersionHashes: (versionHashes: string[]) => void;
  setVersionInfos: (versionInfos: string[]) => void;
  setMetadataVersionIds: (metadataVersionIds: string[]) => void;
  setMetadata: (metadata: string[]) => void;
  setTimestampsIds: (timestampsIds: string[]) => void;
  setAdministratorLastHash: (administratorLashHash: string[]) => void;
  didRecord: any;
  identifier: string;
  versionHashes: string[];
  walletAddress: string;
  metadataVersionIds: string[];
  setDidRecordsIds: (didRecordsIds: string[]) => void;
  didControllers: string[];
};
