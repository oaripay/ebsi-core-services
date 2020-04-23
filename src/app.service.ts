import {Injectable, NotImplementedException, UnauthorizedException} from '@nestjs/common';

import {EthersService} from './ethers.service';
import {GovernmentBody, UniversityBody, Document, Accreditation} from './validation';
import config from './config';
import fs from 'fs';
import NodeRSA from 'node-rsa';
import jose from 'jose';
import axios from 'axios';

@Injectable()
export class AppService {
    private univContract;
    private govContract;
    private jwtToken;

    constructor(private ethersService: EthersService) {
        this.univContract = this.ethersService.getContracts().univContract;
        this.govContract = this.ethersService.getContracts().govContract;
    }

    getIssuer(did: string) {
        return this.univContract.getTrustedIssuer(did);
    }

    async insertGovernment(body: GovernmentBody) {
        const govTi = await this.govContract.addTrustedIssuer(
            body.issuerDID,
            body.name,
            body.country,
        );
        return govTi.wait();
    }

    async insertUniversity(body: UniversityBody) {
        const univTi = await this.univContract.addTrustedIssuer(
            body.issuerDID,
            body.preferredName,
            body.alternativeName,
            body.homepage,
            body.escoOrganizationType,
            body.siteLocation);
        await univTi.wait();
        const univTii = await this.univContract.addTrustedIssuerIdentifiers(
            body.issuerDID,
            body.id,
            body.legalIdentifier,
            body.vatIdentifier,
            body.taxIdentifier,
            body.identifier,
        );
        await univTii.wait();
    }

    async addDocumentToIssuer(did: string, body: Document) {
        const univDoc = await this.univContract.addDocument(
            did,
            body.vcCode,
            body.title,
            body.revision,
            body.status,
            body.type,
            body.dateStart,
        );
        return univDoc.wait();
    }

    async addGovDocumentToIssuer(did: string, body: Document) {
        const govDoc = await this.govContract.addDocument(
            did,
            body.vcCode,
            body.title,
            body.revision,
            body.status,
            body.dateStart,
        );
        return govDoc.wait();
    }

    async addAccreditationToIssuer(did: string, body: Accreditation) {
        const accUniv = await this.univContract.addAccreditation(
            did,
            body.targetFramework,
            body.targetResource,
        );
        return accUniv.wait();
    }

    async getDocuments(did: string) {
        const documentIndexes = await this.univContract.getAllDocumentIndexes(did);
        const documentsPromises = [];
        for (const index of documentIndexes) {
            documentsPromises.push(this.univContract.getDocument(did, index));
        }
        return Promise.all(documentsPromises);
    }

    async getDocumentsForGov(did: string) {
        const documentIndexes = await this.govContract.getAllDocumentIndexes(did);
        const documentsPromises = [];
        for (const index of documentIndexes) {
            documentsPromises.push(this.govContract.getDocument(did, index));
        }
        return Promise.all(documentsPromises);
    }

    async getAccreditations(did: string) {
        const nrOfAccreditations = await this.univContract.getNrOfAccreditations(did);
        const accreditationsPromises = [];
        for (let i = 0; i < nrOfAccreditations.toNumber() - 1; i++) {
            accreditationsPromises.push(this.univContract.getAccreditation(did, i));
        }
        return Promise.all(accreditationsPromises);
    }

    getIssuerForGov(did: string) {
        return this.govContract.getTrustedIssuer(did);
    }

    doesIssuerExists(did: string) {
        return this.univContract.isTrustedIssuer(did);
    }

    doesIssuerForGovExists(did: string) {
        return this.govContract.isTrustedIssuer(did);
    }
    async getGovTrustedIssuers() {
        const nrOfTrustedIssuers = await this.govContract.getNrOfTrustedIssuers();
        const universityTrustedIssuersPromises = [];
        for (let i = 0; i < nrOfTrustedIssuers.toNumber(); i++) {
            universityTrustedIssuersPromises.push(this.govContract.getTrustedIssuerByIndex(i));
        }
        return Promise.all(universityTrustedIssuersPromises);
    }
    async getUniversityTrustedIssuers() {
        const nrOfTrustedIssuers = await this.univContract.getNrOfTrustedIssuers();
        const universityTrustedIssuersPromises = [];
        for (let i = 0; i < nrOfTrustedIssuers.toNumber(); i++) {
            universityTrustedIssuersPromises.push(this.univContract.getTrustedIssuerByIndex(i));
        }
        return Promise.all(universityTrustedIssuersPromises);
    }
    async generateLoginChallenge(did: string, type: string) {
        const timestamp = Date.now() + config.AUTH_EXPIRE_TIME * 60 * 1000;
        const challenge = did + '.' + timestamp + '.' + type;
        const key = this.loadKey();
        return key.encrypt(challenge, 'base64');
    }
    loadKey() {
        const privateKey = fs.readFileSync(__dirname + '/../key/private.pem').toString('utf-8');
        return new NodeRSA(privateKey, 'pkcs8');
    }

    async decryptChallenge(encryptedChallenge: string) {
        const key = this.loadKey();
        return key.decrypt(encryptedChallenge, 'utf8');
    }
    async checkLogin(cryptedMessage, signature: string, type: string) {
        // recover address from signature
        const address = await this.ethersService.recoverAddress(cryptedMessage, signature);
        // check address is admin onchain
        let signer;
        switch (type) {
            case 'universities':
                signer = await this.univContract.isSigner(address);
                break;
            case 'governments':
                signer = await this.govContract.isSigner(address);
                break;
            default:
                // not implemented
                throw new NotImplementedException('not implemented');
        }
        if (!signer) {
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
    async login() {
        if (typeof this.jwtToken === 'undefined') {
            try {
                const response = await this.generateLoginJWT();
                console.log(response);
                this.jwtToken = response.data.accessToken;
            } catch (error) {
                console.log(error.message);
            }
        }
    }
    async generateLoginJWT() {
        const key = this.loadKey();
        const {JWT, JWK} = jose;
        const privateKey = JWK.asKey(key.exportKey());
        const payload = {
            iss: config.APP_NAME,
            aud: config.APP_AUTH_REQUEST_NAME,
        };
        const token = JWT.sign(payload, privateKey, {
            expiresIn: '15 minutes',
        });
        const jwtToken = axios.get((config.STORAGE).replace(/\/$/, '') + '/v1/sessions', {
            headers: {
                Authorization: 'Bearer ' + token,
            },
        });
        return jwtToken;
    }
    async downloadDocument(documentHash: string) {
        await this.login();
        try {
            return axios.get((config.APP_STORAGE).replace(/\/$/, '') + '/v1/' + documentHash, {
                headers: {
                    Authorization: 'Bearer ' + this.jwtToken,
                },
            });
        } catch (Error) {
            return null;
        }
    }
}
