/* eslint-disable no-underscore-dangle */
import { Wallets } from "fabric-network";
import {
  Client,
  Channel,
  Endorsement,
  IdentityContext,
  EndorsementResponse,
} from "fabric-common";
import crypto from "crypto";
import {
  CommitAction,
  ProposalAction,
  ProposalResponseBase64,
} from "../../src/modules/fabric/fabric.interface";
import { ProposalActionDto } from "../../src/modules/fabric/dto/proposal-action.dto";
import { CommitActionDto } from "../../src/modules/fabric/dto/commit-action.dto";

const channelName = "iossdrpocchannel";
const contractName = "iossdrpociossvatid";

export class FabricUser {
  channel: Channel;

  identityContext: IdentityContext;

  endorsement: Endorsement;

  async init(name: string, walletPath: string): Promise<void> {
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(name);
    const provider = wallet.getProviderRegistry().getProvider(identity.type);
    const user = await provider.getUserContext(identity, name);

    const client = new Client("client");
    this.channel = new Channel(channelName, client);
    this.identityContext = client
      .newIdentityContext(user)
      .calculateTransactionId();
  }

  static prepareTxParams(
    iossvatid: string,
    startDate: string,
    endDate: string
  ): {
    transient: Record<string, Buffer>;
    params: string[];
  } {
    const currentDate = new Date().toISOString().slice(0, -5).replace("T", " ");
    const uuid = crypto.randomUUID();
    const salt = crypto.randomBytes(10).toString("hex");

    const transientData = Buffer.from(JSON.stringify({ iossvatid }));

    return {
      transient: { iossvatid: transientData },
      params: [startDate, endDate, currentDate, uuid, salt],
    };
  }

  buildSignProposal(
    iossvatid: string,
    startDate: string,
    endDate: string
  ): {
    action: ProposalActionDto;
    payload: string;
    signature: string;
    transactionId: string;
  } {
    const { transient, params } = FabricUser.prepareTxParams(
      iossvatid,
      startDate,
      endDate
    );
    this.endorsement = new Endorsement(contractName, this.channel);
    this.endorsement.build(this.identityContext, {
      fcn: "registerIossVatId",
      args: params,
      generateTransactionId: false,
      transientMap: transient,
    });
    this.endorsement.sign(this.identityContext);

    const action = (this.endorsement as unknown as { _action: ProposalAction })
      ._action;
    const payload = (this.endorsement as unknown as { _payload: Buffer })
      ._payload;
    const signature = (this.endorsement as unknown as { _signature: Buffer })
      ._signature;

    const transientMap: ProposalActionDto["transientMap"] = {};
    if (action.transientMap) {
      Object.keys(action.transientMap).forEach((key) => {
        transientMap[key] = action.transientMap[key].toString("base64");
      });
    }
    return {
      action: {
        init: action.init,
        transientMap,
        transactionId: action.transactionId,
        args: action.args.map((arg) => arg.toString("base64")),
        fcn: action.fcn,
        header: {
          signature_header: action.header.signature_header.toString("base64"),
          channel_header: action.header.channel_header.toString("base64"),
        },
        proposal: {
          header: action.proposal.header.toString("base64"),
          payload: action.proposal.payload.toString("base64"),
        },
      },
      payload: payload.toString("base64"),
      signature: signature.toString("base64"),
      transactionId: this.endorsement.getTransactionId(),
    };
  }

  setProposalResponses(responses: ProposalResponseBase64[]): void {
    (
      this.endorsement as unknown as {
        _proposalResponses: EndorsementResponse[];
      }
    )._proposalResponses = responses.map((response) => ({
      connection: {
        type: "",
        name: "",
        url: "",
        options: {},
      },
      endorsement: {
        endorser: Buffer.from(response.endorsement.endorser, "base64"),
        signature: Buffer.from(response.endorsement.signature, "base64"),
      },
      payload: Buffer.from(response.payload, "base64"),
      response: {
        status: response.response.status,
        message: response.response.message,
        payload: Buffer.from(response.response.payload, "base64"),
      },
    }));
  }

  buildSignCommit(): {
    action: CommitActionDto;
    payload: string;
    signature: string;
    transactionId: string;
  } {
    const commit = this.endorsement.newCommit();
    commit.build(this.identityContext);
    commit.sign(this.identityContext);

    const action = (commit as unknown as { _action: CommitAction })._action;
    const payload = (commit as unknown as { _payload: Buffer })._payload;
    const signature = (commit as unknown as { _signature: Buffer })._signature;

    return {
      action: {
        init: action.init,
        payload: {
          header: {
            signature_header:
              action.payload.header.signature_header.toString("base64"),
            channel_header:
              action.payload.header.channel_header.toString("base64"),
          },
          data: action.payload.data.toString("base64"),
        },
      },
      payload: payload.toString("base64"),
      signature: signature.toString("base64"),
      transactionId: this.endorsement.getTransactionId(),
    };
  }
}

export default FabricUser;
