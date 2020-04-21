import { Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import * as jose from 'jose';
import fs from 'fs';
import NodeRSA from 'node-rsa';
import config from '../config';
import { EthersService } from './ethers.service';

@Injectable()
export class AppService {
  private jwt: {
    decode: (token: string) => object,
    verify: (jwt: string, key: jose.ConsumeKeyInput) => string | object;
    sign: (payload: string | Buffer | object, key: jose.ProduceKeyInput) => string,
  };
  private etherService;

  private key: jose.JWK.RSAKey | jose.JWK.ECKey | jose.JWK.OKPKey | jose.JWK.OctKey;

  constructor(private readonly ethersService: EthersService) {
    this.jwt = jose.JWT;
    this.ethersService = ethersService;
  }
  base64Buffer(key: string) {
    return Buffer.from(key, 'base64').toString('utf8');
  }

  asKey(key: string) {
    return jose.JWK.asKey(key);
  }
  sign(payload: string | Buffer | object) {
    return this.jwt.sign(payload, this.key);
  }

  verify(jwt: string, key: jose.ConsumeKeyInput) {
    return this.jwt.verify(jwt, key || this.key);
  }

  decode(token: string) {
    return this.jwt.decode(token);
  }

  generateLoginChallenge(name: string) {
    const timestamp = Date.now() + config.AUTH_EXPIRE_TIME * 60 * 1000;
    const challenge = name + '.' + timestamp;
    const key = this.loadKey();
    return key.encrypt(challenge, 'base64');
  }
  loadKey() {
    const privateKey = fs.readFileSync(__dirname + '/../../../key/private.pem').toString('utf-8');
    return new NodeRSA(privateKey, 'pkcs8');
  }

  async decryptChallenge(encryptedChallenge: string) {
    const key = this.loadKey();
    return key.decrypt(encryptedChallenge, 'utf8');
  }
  async checkLogin(cryptedMessage, signature: string) {
    // recover address from signature
    const address = await this.ethersService.recoverAddress(cryptedMessage, signature);
    // check address is admin onchain
    const signer = await this.ethersService.getSigner();
    if (!signer || signer !== address) {
      throw new UnauthorizedException('your ether wallet is not authorized');
    }
    // decrypt message
    const messageDecrypted = await this.decryptChallenge(cryptedMessage);
    const messageDecryptedArray = messageDecrypted.split('.');
    // check the date
    const currentTimestamp = Date.now();
    if (currentTimestamp > parseInt(messageDecryptedArray[1], 10)) {
      throw new UnauthorizedException('login expired');
    }
    // return DID
    return messageDecryptedArray[0];
  }
}
