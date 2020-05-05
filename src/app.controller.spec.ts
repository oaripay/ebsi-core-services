import request from 'supertest';
import { Test } from '@nestjs/testing';
import {AppController} from './app.controller';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { EthersService } from './shared/services/ethers.service';
import { AppService } from './shared/services/app.service';
class AppServiceMock {
  generateLoginChallenge() {return []; }
  checkLogin() {return []; }

}
// tslint:disable-next-line:max-classes-per-file
class EtherServiceMock {
  getApplicationPublicKey() {return []; }
  getAuthorizedApps() {return []; }
  addApplication() {return []; }
  addNewAuthorization() {return []; }
  revertMessage() {return []; }
  getApplicationKeys() {return []; }
  getApplicationByKey() {return []; }
}

// tslint:disable-next-line:max-classes-per-file
class TestBesuException extends Error {
  private readonly response;
  private readonly status;
  readonly message: any;
  readonly transactionHash = 'transactionHash';
  private getErrorString;
}

describe ('AppController', () => {
  let app: INestApplication;
  let appController: AppController;
  let etherService: EthersService;
  let appService: AppService;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [EthersService, AppService],
    })
      .overrideProvider(AppService)
      .useValue(new AppServiceMock())
      .overrideProvider(EthersService)
      .useValue(new EtherServiceMock())
      .compile();
    appController = module.get<AppController>(AppController);
    etherService = module.get<EthersService>(EthersService);
    appService = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  describe('Test GET\'s', () => {
    it(`/GET all apps`, () => {
      jest.spyOn(etherService, 'getApplicationKeys').mockResolvedValue(['key0', 'key1']);

      jest.spyOn(etherService, 'getApplicationByKey').mockImplementation(
          (key) => { return [
            'appName'+key, 'pubKey'+key
          ]}
          );

      return request(app.getHttpServer())
          .get('/trusted-apps-registry/v1/apps')
          .expect(200)
          .expect( {
                items: [
                  { appName: 'appNamekey0', pubKey: 'pubKeykey0' },
                  { appName: 'appNamekey1', pubKey: 'pubKeykey1' }
                ],
                total: 2,
                pageSize: 10,
                first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                prev: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                next: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                last: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10'
              }
          );
    });

    it(`/GET all apps invalid page number`, () => {
      jest.spyOn(etherService, 'getApplicationKeys').mockResolvedValue(['key0', 'key1']);

      jest.spyOn(etherService, 'getApplicationByKey').mockImplementation(
          (key) => { return [
            'appName'+key, 'pubKey'+key
          ]}
      );

      return request(app.getHttpServer())
          .get('/trusted-apps-registry/v1/apps?page[after]=10')
          .expect(400)
          .expect( (response) => {
                expect(response.body.message).toEqual('invalid page number');
              }
          );
    });

    it(`/GET all apps no application found`, () => {
      jest.spyOn(etherService, 'getApplicationKeys').mockResolvedValue([]);

      jest.spyOn(etherService, 'getApplicationByKey').mockImplementation(
          (key) => { return [
            'appName'+key, 'pubKey'+key
          ]}
      );

      return request(app.getHttpServer())
          .get('/trusted-apps-registry/v1/apps')
          .expect(200)
          .expect({
                items: [],
                total: 0,
                pageSize: 10,
                first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                prev: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                next: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                last: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10'
              }
          );
    });

    it(`/GET app public key`, () => {
      jest.spyOn(etherService, 'getApplicationPublicKey').mockResolvedValue('thekey');
      const key = 'testappkey';
      return request(app.getHttpServer())
        .get('/trusted-apps-registry/v1/apps/' + key)
        .expect(200)
        .expect( { appName: 'testappkey', pubKey: 'thekey' });
    });

    it(`/GET app pub key -> throw entity not found`, () => {
      jest.spyOn(etherService, 'getApplicationPublicKey').mockImplementation(() => {throw new NotFoundException(); });
      const key = 'noappkey';
      return request(app.getHttpServer())
        .get('/trusted-apps-registry/v1/apps/' + key)
        .expect(404)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual(`${key} not found`);
          },
        );
    });

    it(`/GET authorized apps by appname`, () => {
      jest.spyOn(etherService, 'getAuthorizedApps').mockResolvedValue(
        [
          [
            'ebsi-besu',
          ],
          [
            true,
          ],
        ]);
      const appName = 'ebsi-wallet-test-app-name';
      return request(app.getHttpServer())
        .get(`/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`)
        .expect(200)
        .expect( {
              items: [ { authorizedAppName: 'ebsi-besu' } ],
              total: 1,
              pageSize: 10,
              first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
              prev: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
              next: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
              last: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10'
            }
        );
    });

    it(`/GET authorized apps by appname - >test malware service`, () => {
      jest.spyOn(etherService, 'getAuthorizedApps').mockResolvedValue(
        {test: 'scrambled value'});
      const appName = 'ebsi-wallet-test-app-name';
      return request(app.getHttpServer())
        .get(`/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`)
        .expect(404)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('Application does not exist');
          },
        );
    });

    it(`/GET authorized apps by appname - >test service throws if besu doesnt have app`, () => {
      jest.spyOn(etherService, 'getAuthorizedApps').mockImplementation(() => { throw new NotFoundException(); });
      const appName = 'ebsi-wallet-test-app-name';
      return request(app.getHttpServer())
        .get(`/trusted-apps-registry/v1/apps/${appName}/authorized-apps/`)
        .expect(404)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('Application does not exist');
          },
        );
    });

  });
  describe('get Challenge by AppName', () => {
    it(`/GET app public key`, () => {
      jest.spyOn(appService, 'generateLoginChallenge').mockImplementation(() => 'the key');
      const appName = 'the_name';
      return request(app.getHttpServer())
        .get('/trusted-apps-registry/v1/challenge/' + appName)
        .expect(200)
        .expect( 'the key');
    });

    it(`/GET app public key - service throws exception`, () => {
      jest.spyOn(appService, 'generateLoginChallenge').mockImplementation(() => { throw new NotFoundException(); });
      const appName = 'the_name';
      return request(app.getHttpServer())
        .get('/trusted-apps-registry/v1/challenge/' + appName)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('there was a problem to process your request');
          },
        );
    });
  });

  describe('Test Post\'s', () => {
    it(`/POST new App`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addApplication').mockResolvedValue('app-added-to-besu');
      const body = {
        name: 'ebsi-wallet-jest-test',
        pubKey: 'test',
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/register-app')
        .send(body)
        .expect(201)
        .expect('app-added-to-besu');

    });

    it(`/POST new App throws login`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addApplication').mockResolvedValue('app-added-to-besu');
      const body = {
        name: 'ebsi-wallet-jest-test1',
        pubKey: 'test',
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/register-app')
        .send(body)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('you are not authorized to insert for this DID');
          },
        );

    });
    it(`/POST new App throws on besu`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addApplication').mockImplementation(() => { throw new NotFoundException('a message from besu'); });

      const body = {
        name: 'ebsi-wallet-jest-test',
        pubKey: 'test',
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/register-app')
        .send(body)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('a message from besu');
          },
        );

    });

    it(`/POST new authorization for an existing app`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addNewAuthorization').mockResolvedValue('authorization added');
      const body = {
        appName: 'ebsi-wallet-jest-test',
        authName: 'ebsi-wallet-jest-test2',
        status: true,
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/authorize')
        .send(body)
        .expect(201)
        .expect('authorization added');

    });

    it(`/POST new authorization for an existing app -> throw on login`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addNewAuthorization').mockResolvedValue('authorization added');
      const body = {
        appName: 'ebsi-wallet-jest-throw-login',
        authName: 'ebsi-wallet-jest-test2',
        status: true,
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/authorize')
        .send(body)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('you are not authorized to insert for this DID');
          },
        );
    });

    it(`/POST new authorization for an existing app -> throw on besu insert`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addNewAuthorization').mockImplementation(() => { throw new NotFoundException('test'); });
      jest.spyOn(etherService, 'revertMessage').mockResolvedValue('a message from besu');

      const body = {
        appName: 'ebsi-wallet-jest-test',
        authName: 'ebsi-wallet-jest-test2',
        status: true,
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/authorize')
        .send(body)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('test');
          },
        );
    });


    it(`/POST new authorization for an existing app -> test besu tx throw error message`, () => {
      // insert a new app in the ledger
      jest.spyOn(appService, 'checkLogin').mockResolvedValue('ebsi-wallet-jest-test');
      jest.spyOn(etherService, 'addNewAuthorization').mockImplementation(() => { throw new TestBesuException('test'); });
      jest.spyOn(etherService, 'revertMessage').mockResolvedValue('besu reverted');

      const body = {
        appName: 'ebsi-wallet-jest-test',
        authName: 'ebsi-wallet-jest-test2',
        status: true,
        authorize: {
          cryptedMessage: 'a message',
          signature: 'a signature',
        },
      };
      return request(app.getHttpServer())
        .post('/trusted-apps-registry/v1/authorize')
        .send(body)
        .expect(400)
        .expect(
          (res) => {
            const resp = JSON.parse(res.text);

            expect(resp.message).toEqual('besu reverted');
          },
        );
    });


  });
  afterAll(async () => {
    await app.close();
  });
});
