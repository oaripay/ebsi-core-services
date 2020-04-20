import {Injectable} from '@nestjs/common';
import { ethers } from 'ethers';

import UniversitiesTrustedIssuers from './contracts/UniversitiesTrustedIssuers.json';
import GovernmentsTrustedIssuers from './contracts/GovernmentsTrustedIssuers.json';

import config from './config';

@Injectable()
export class EthersService {

  private ethersWallet;
  private contract;
  private ethersProvider;
  private univTrustedIssuersContract;
  private govTrustedIssuersContract;

  constructor() {

    this.ethersProvider = new ethers.providers.JsonRpcProvider(config.PROVIDER);
    this.ethersWallet = new ethers.Wallet(config.WALLET_PRIV_KEY, this.ethersProvider);
    const univContractWithoutWallet = new ethers.Contract(config.UNIV_CONTRACT_ADDR, UniversitiesTrustedIssuers.abi, this.ethersProvider);
    const govContractWithoutWallet = new ethers.Contract(config.GOV_CONTRACT_ADDR, GovernmentsTrustedIssuers.abi, this.ethersProvider);

    this.univTrustedIssuersContract = univContractWithoutWallet.connect(this.ethersWallet);
    this.govTrustedIssuersContract = govContractWithoutWallet.connect(this.ethersWallet);
  }

  getContracts() {
    return {
      univContract: this.univTrustedIssuersContract,
      govContract: this.govTrustedIssuersContract,
    };
  }

  recoverAddress(cryptedChallenge, signature) {
    return ethers.utils.verifyMessage(cryptedChallenge, signature);
  }
}
