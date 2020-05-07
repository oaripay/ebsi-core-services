
package xyz.ebsi.ec.fabric.services;

import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.springframework.http.ResponseEntity;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
public interface TransactionServices {
    
    ResponseEntity<Object> getAllTransactions(String channelName, int pageSize)throws InvalidArgumentException, ProposalException;
    
    ResponseEntity<Object> getTransactionByTxID(String channelName, String txId) throws InvalidArgumentException, ProposalException;
}
