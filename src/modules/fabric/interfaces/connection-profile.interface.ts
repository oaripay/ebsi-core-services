export interface ConnectionProfile {
  channels?: {
    [x: string]: {
      orderers?: string[];
      peers?: {
        [x: string]: {
          chaincodeQuery?: boolean;
          eventSource?: boolean;
          ledgerQuery?: boolean;
        };
      };
    };
  };
  name?: string;
  client?: {
    tlsEnable?: boolean;
    enableAuthentication?: boolean;
    adminCredential?: {
      id?: string;
      password?: string;
    };
    organization?: string;
  };
  organizations?: {
    [x: string]: {
      adminPrivateKey?: {
        pem?: string;
        xpath?: string;
      };
      certificateAuthorities?: string[];
      mspid?: string;
      peers?: string[];
      signedCert?: {
        pem?: string;
        xpath?: string;
      };
    };
  };
  peers?: {
    [x: string]: {
      grpcOptions?: {
        "ssl-target-name-override"?: string;
      };
      tlsCACerts?: {
        pem?: string;
        xpath?: string;
      };
      url?: string;
    };
  };
  orderers?: {
    [x: string]: {
      grpcOptions?: {
        "ssl-target-name-override"?: string;
      };
      tlsCACerts?: {
        pem?: string;
        xpath?: string;
      };
      url?: string;
    };
  };
}
