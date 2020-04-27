const EBSIAppRegistry = artifacts.require('EBSIApplicationRegistry');

module.exports = async (deployer, network) => {


    console.log('Deploying EBSI App Registry on the network');

    await deployer.deploy(EBSIAppRegistry)

    console.log('Registry Deployed at ' + EBSIAppRegistry.address)


    let registryInstance = await EBSIAppRegistry.deployed();


    app = {
        name: 'ebsi-besu',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVUeDQrcEtRRmVkZ2hOZU5kVk5OWDRkdTlvZVVyWmQwNwpvNXRUUmFwdFljTGFaNnhtN3ErTXgyczNMRmgxZ1dGNFg5cmNkbWk3dkkxWU9WM3QzNEFRNGc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=',
    }

    console.log('adding app ', app.name)
    await registryInstance.addApplication(app.pubKey, app.name)



    app = {
        name: 'ebsi-fabric',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVwRlNOL0E1ZnlIUVhIMHkrblE1T2kyM2wrSjN2YW9KbAp3RkxiakhkbkkzN1FsOUtndTFrQzM4azBLTkF0WDhsZ3pMM2hvQUFzTXVvb2R0cTRrb2lOeGc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=',
    }

    console.log('adding app ', app.name)
    await  registryInstance.addApplication(app.pubKey, app.name)


    app = {
        name: 'ebsi-wallet',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVySVZhMmdvNTBnU3M1cENERjV3WStmYjUrVHpUenlDVwpBOVI4TGp1dTVYenozSUxoM1UvCk50a0NzS3I1Z2pYdUhNVlhka000eVdQMGJ5NTlFb0dYeWp3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t',
    }

    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ebsi-notary',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVzM2hTVW9NQkZZRkNKd2ZZeUJJdmFhUWVLajF5V0h1VwpFOW1rZXE4Q3VKbWYrYkhLU1hrdjV2aDNsZGRQS1hlak5RWmM0SG9RcjBEMDhGREpCUVBvY0E9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='
    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

   app = {
        name: 'ebsi-storage',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVUQ2czYnNmWmh4NENLQkRpUUFLeUFsNU5rTVpXNFdxbwo0U2pvRjZxNDR0VFJtSUYxTlZlSXo3LzFaeHppMFhWRTcyUU9NeXZIWnpXeEQ1Q3MrVjl2QVE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0'
    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)



    app = {
        name: 'ebsi-diploma',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMYTIvWHFPK2Ntc0hoMENMZVJLWFp3VHlKSjEwQzR4Tgo0MWVPTFIraUpEOXhQUy8KT28xN3RSOHNRQUh6aklicWVKUWRoS0VJN1gwZTY1K1licmRpQk9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t'
    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ebsi-eidas-bridge',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='
    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ext-eca',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVHWXZGNDFuZm5KenlnWWFmZzlSMjB2TnhSejU1elFoaQpJb3hENEpwZG9JZm9yazFXN0wxTzhjKzNabVgrOU91ZXZETGJMQ1A1L2hnSTh2RHBjYUdzUEE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='
    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)
    app = {
        name: 'ext-taxud',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVRMkNoUlgrZzhkbDd6RzBvdEZJdkdBQzl1ai9vMW1vbwpCVkNaN1hJZmNVR1Y5M0JHdDVDeG1LWjNNcU5qaDYzdm5ENVExa2s3NkgzNFhPWGlWaTRmakE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)


    app = {
        name: 'ebsi-ledger',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVqVFNEOWNPSWtMLzhnaks3L3gxbnpuVzB0SFM0TUpVMQpJMW1YR3lOYlF0Sm9FL3ozUkZ4YlU5SktHR28xYnA0a1A4M0VaaU5KYy9zS1dOQ3pra3BuRnc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0K'

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)


    app = {
        name: 'trusted-apps-registry',
        pubKey: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXhBV045QjlQM2l4RVVPZXM3d3g4UXJXOXpwcmp3TGRnMHRGRUkvUVFXd09adGo1dnNvUVUKYjVZbXF2TVRQT3kxSnpobUlzVU9CNFpmeUlhVkdvZ3B3bWxvUzlBd3VhMXd1alVBNW95K1BNcTEyV3doTnRMaApYQWdXTGRXaHdKSWpCMko5aHZ5b0pZWVIyZnp2TVdGeEZqV1BleXNHRmdJZTJiRW4zQVQ4b2IxNUwvL0I5MUpVCjRDNnFSUjh0SGhWbm1ZeXc0Y3V1RWJEVGs1Z0ltZ2dPbjRUWHdaOHJOT21SZkw4NlZmZTB1d2VuN0o4WjVocnEKQ2trVjVkMXdIeSt6RkxXdUZrcEo0N0ZQVWpESGExM09oeVFWOUlwYjlBWm9QVGUyZjhUOGdUVGlUNGQyZkQxQgp0bk9IT0ZmbGhyREM4YzAzRWwwdzZvaThSN2lFQU1TbHlRSURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0='

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)


    app = {
        name: 'trusted-issuers-registry',
        pubKey: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXhBV045QjlQM2l4RVVPZXM3d3g4UXJXOXpwcmp3TGRnMHRGRUkvUVFXd09adGo1dnNvUVUKYjVZbXF2TVRQT3kxSnpobUlzVU9CNFpmeUlhVkdvZ3B3bWxvUzlBd3VhMXd1alVBNW95K1BNcTEyV3doTnRMaApYQWdXTGRXaHdKSWpCMko5aHZ5b0pZWVIyZnp2TVdGeEZqV1BleXNHRmdJZTJiRW4zQVQ4b2IxNUwvL0I5MUpVCjRDNnFSUjh0SGhWbm1ZeXc0Y3V1RWJEVGs1Z0ltZ2dPbjRUWHdaOHJOT21SZkw4NlZmZTB1d2VuN0o4WjVocnEKQ2trVjVkMXdIeSt6RkxXdUZrcEo0N0ZQVWpESGExM09oeVFWOUlwYjlBWm9QVGUyZjhUOGdUVGlUNGQyZkQxQgp0bk9IT0ZmbGhyREM4YzAzRWwwdzZvaThSN2lFQU1TbHlRSURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0='

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ebsi-idhub',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVkT3NiWEZmRUpzZHdsc3JmZ0xaVHJrUG1iVU5uN2VUTgp5MGRqQW5UZTNoM2RGM09mZkVJTk1xUzlSRm5vMnVXS1RINzlsdTNMYmVnc3pGOHdWUFpnUGc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ebsi-self-sovereign-identity',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVsUmUyZGNFVGlrMHBzZWJOZGJUaFdPc0FQT2UrWFQ3OQpxTTRCTmd6N2NOVXJ1bklIYmxZZExPWmNUeUU3SS9wamVGaTJPUFZ1cjlqMTh0Uzg5anhoWXc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0K'

    }
    console.log('adding app ', app.name)

    await registryInstance.addApplication(app.pubKey, app.name)


    console.log ('adding access from all to all')

    let apps = ['ebsi-besu', 'ebsi-fabric', 'ebsi-wallet', 'ebsi-notary', 'ebsi-storage', 'ebsi-diploma', 'ebsi-ledger', 'trusted-apps-registry', 'ebsi-eidas-bridge', 'ebsi-idhub', 'trusted-issuers-registry'];

    for(i=0; i<apps.length; i++) {
        for(j=0; j<apps.length; j++) {
            if (i===j) continue;
            console.log('adding on ', apps[i], ' ', apps[j]);
            await registryInstance.addNewAuthorization(apps[i], apps[j], true);
        }
    }

    console.log ('adding access of ebsi-notary to ext-eca')
    await registryInstance.addNewAuthorization('ebsi-notary', 'ext-eca', true);


    console.log ('adding access of ebsi-fabric to ext-taxud')
    await registryInstance.addNewAuthorization('ebsi-fabric', 'ext-taxud', true);

}
