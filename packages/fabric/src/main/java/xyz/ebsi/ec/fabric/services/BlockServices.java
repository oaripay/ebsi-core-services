
package xyz.ebsi.ec.fabric.services;


import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.springframework.http.ResponseEntity;


/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
public interface BlockServices {
    
    ResponseEntity<Object> getAllBlocks(String channelName, int pageSize) throws InvalidArgumentException, ProposalException;
    
    ResponseEntity<Object> getBlockBynumber(String channelName, long number)throws InvalidArgumentException, ProposalException;   
}
