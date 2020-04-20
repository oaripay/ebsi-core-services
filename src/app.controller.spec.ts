import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import {AppController} from './app.controller';
import {AppFormatter} from './app.formatter';
import {NotFoundException} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import testValues from './testVar.json';
import {UniversityBody} from './validation';

class AppServiceMock {
    getIssuer(did: string) {
        return testValues.issuerResult;
    }
    getUniversityTrustedIssuers() { return []; }
    getGovTrustedIssuers() { return []; }
    doesIssuerExists() { return []; }
    insertUniversity() { return []; }

}

describe ('AppController', () => {
    let app: INestApplication;
    let appController: AppController;
    let appService: AppService;
    let appFormatter: AppFormatter;
    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService, AppFormatter],
        })
            .overrideProvider(AppService)
            .useValue(new AppServiceMock())
            .compile();
        appController = module.get<AppController>(AppController);
        appService = module.get<AppService>(AppService);
        appFormatter = module.get<AppFormatter>(AppFormatter);

        app = module.createNestApplication();
        await app.init();
    });

    describe('Universities APIs', () => {

        it(`/GET Univ issuers`, () => {
            jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultUniversities));
            return request(app.getHttpServer())
                .get('/trusted-issuers/universities')
                .expect(200)
                .expect(
                    testValues.resultUniversities,
                );
        });
        it(`/GET Univ issuers will fail service not found`, () => {
            jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => {throw new Error('test'); } );
            return request(app.getHttpServer())
                .get('/trusted-issuers/universities')
                .expect(404)
                .expect(
                    (res) => {
                        const resp = JSON.parse(res.text);

                        expect(resp.message).toEqual('Besu API not working.');
                    },
                );
        });
        it(`/POST universities - create universities - university already exists`, () => {
            jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => true );
            return request(app.getHttpServer())
                .post('/trusted-issuers/universities')
                .expect(400)
                .expect(
                    (res) => {
                        const resp = JSON.parse(res.text);

                        expect(resp.message).toEqual('University already exists!');
                    },
                );
        });
        it(`/POST universities - create universities - no priv key found`, () => {
            jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => false );
            jest.spyOn(appService, 'insertUniversity').mockImplementation(() => {throw new Error('test'); } );
            return request(app.getHttpServer())
                .post('/trusted-issuers/universities')
                .expect(401)
                .expect(
                    (res) => {
                        const resp = JSON.parse(res.text);

                        expect(resp.message).toEqual('ether key not found');
                    },
                );
        });

        test(`/POST universities - create universities - success`, async (done) => {
            jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => false );
            jest.spyOn(appService, 'insertUniversity').mockImplementation(async (body: UniversityBody) => Promise.resolve() );
            const bodyVar = testValues.univBody;
            request( app.getHttpServer())
                .post('/trusted-issuers/universities')
                .send(bodyVar)
                .then(res => {
                    expect(res.status).toBe(201);
                    expect(JSON.stringify(res.body)).toBe(JSON.stringify(bodyVar));
                });
            done();

        });

    });
    describe('Governments APIs', () => {

        it(`/GET Gov issuers`, () => {
            jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultGov));
            return request(app.getHttpServer())
                .get('/trusted-issuers/governments')
                .expect(200)
                .expect(
                    testValues.resultGov,
                );
        });

        it(`/GET Gov issuers will fail service not found`, () => {
            jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => {throw new Error('test'); } );
            return request(app.getHttpServer())
                .get('/trusted-issuers/governments')
                .expect(404)
                .expect(
                    (res) => {
                        const resp = JSON.parse(res.text);

                        expect(resp.message).toEqual('Besu API not working.');
                    },
                );
        });

    });
    afterAll(async () => {
        await app.close();
    });
});
