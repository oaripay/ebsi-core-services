/* eslint-disable no-underscore-dangle */
import { Wallets } from "fabric-network";
import { Client, Channel, Endorsement, IdentityContext } from "fabric-common";
import crypto from "crypto";
import { ProposalAction } from "../../src/modules/fabric/fabric.interface";
import { ProposalActionDto } from "../../src/modules/fabric/dto/proposal-action.dto";

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

  /*
    buildSignCommit() {
      const commit = this.endorsement.newCommit();
      commit.build(this.identityContext);
      commit.sign(this.identityContext);
      return {
        caction: commit._action,
        cpayload: commit._payload,
        csignature: commit._signature,
      }
    }
    */
}

export default FabricUser;
