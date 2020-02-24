/* 
 * REF 1: https://github.com/trufflesuite/truffle/issues/314
 * REF 2: https://github.com/trufflesuite/truffle-contract/issues/117
 * REF 3: https://github.com/trufflesuite/truffle/blob/next/packages/truffle-contract/test/events.js#L118-L143 
 * REF 4: https://ethereum.stackexchange.com/questions/54967/how-to-get-only-past-2-days-events-using-getpastevents-everytime?rq=1
 *        { fromBlock: (await web3.eth.getBlockNumber()) - 12343,  toBlock: "latest" }); 
 *                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                     latest block
 * https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#getpastevents
 */

// https://ethereum-magicians.org/t/removing-or-increasing-the-contract-size-limit/3045

const BN_ZERO = new web3.utils.BN(0)


var assertCount = 0; // Test Stats purposes only
const assert_equal   = function(a,b,c) { assertCount++ ; assert.equal  (a,b, c); }
// assert_err  = function(a,b,c) { assertCount++ ; assert.isTrue  (a.reason.indexOf(b)==0, c); }
const assert_err  = function(a,b,c) { assertCount++ ; assert.isTrue  (a!==undefined && a!=null);  }

const assert_isTrue  = function(a,b  ) { assertCount++ ; assert.isTrue (a,b   ); }
const assert_isFalse = function(a,b  ) { assertCount++ ; assert.isFalse(a,b   ); }

const MUST_NOT_EXECUTE = { reason : "This code must never be executed. An exception must be raised" }

const NotaryContract = artifacts.require("Notary");
const ethers = require("ethers");

JSON.stringifySec = function (circ) {
    cache = []
    result = JSON.stringify(circ, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Duplicate reference found, discard key
                return
            }   
            // Store value in our collection
            cache.push(value)
        }   
        return value
    })  
    cache = null
    return result                                                                                           
}


let web3Provider;
contract('RealEstateControllerFullJourney', accounts => {
  const ACCT0 = accounts[0]; const FROM_ACCT0 = { from : ACCT0 }
  const ACCT1 = accounts[1]; const FROM_ACCT1 = { from : ACCT1 }   
  const ACCT2 = accounts[2]; const FROM_ACCT2 = { from : ACCT2 }       

  let NOTARY ; // proxy class to published smart-contract instance
  before('setup Contract', async() => {
    NOTARY  = await NotaryContract.new()   
  })

  after('PRINT TEST STATS', () => {
    console.log("assertCount:"+assertCount)
  })

  describe('SMART-CONTRACT functionality', () => {
    it("SHOULD notarize document properly", async () => {
        // REF: https://docs.ethers.io/ethers.js/html/api-utils.html
        const hash01 = ethers.utils.hashMessage("INPUT_STRING")
        const result = await NOTARY.addRecord(hash01)
        assert_equal(result.receipt.logs.length,1, "")
        const log0   = result.receipt.logs[0]
        assert_equal(log0.event    , "REC", "") 
        assert_equal(typeof hash01 , Object.keys(hash01), "") 
        // NOTE: The smart-contract is emiting a uint that translates to a
        //     web3.util.BN. To match the original hash01 (string type) some 
        //     string manipulation is needed. The problem dissapear if using
        //     bytes32 (vs int256) in the original smart-contract.
        assert_equal(JSON.stringifySec(log0.args["0"]).replace(/"/g,''), hash01.toString().replace('0x','') )
        assert_equal(log0.args["1"], ACCT0 ,"")
      }
    )
   })

//  it("SHOULD failt to add document array", async () => {
//    // addMultipleRecords(uint[] memory zz)
//  })
 
// TODO:(0) disabled. (EBSIv2)
//  it('SHOULD allow to transfer Ownership', async () => {
//     await NOTARY.transferOwnership(ACCT1); 
//  })

//})
})

