

package xyz.ebsi.ec.fabric.services;

import com.google.protobuf.InvalidProtocolBufferException;
import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collection;
import static java.util.stream.Collectors.toList;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hyperledger.fabric.protos.peer.FabricProposalResponse.ProposalResponsePayload;
import org.hyperledger.fabric.sdk.BlockInfo;
import org.hyperledger.fabric.sdk.BlockchainInfo;
import org.hyperledger.fabric.sdk.Channel;
import org.hyperledger.fabric.sdk.TransactionInfo;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.hyperledger.fabric.sdk.exception.TransactionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import xyz.ebsi.ec.fabric.config.Tools;
import xyz.ebsi.ec.fabric.dbo.TransactionDbo;
import xyz.ebsi.ec.fabric.dto.Links;
import xyz.ebsi.ec.fabric.dto.PageResult;
import xyz.ebsi.ec.fabric.exception.FabricError;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */

@Service
public class TransactionServicesImpl implements TransactionServices{

    private static final Logger log = LogManager.getLogger(TransactionServicesImpl.class);     

    @Autowired
    Tools tools;  
    
    Channel channel;
    
    PageResult<TransactionDbo> transactionPage = new PageResult();
    
    Links links = new Links();
    
    @Override
    public ResponseEntity<Object> getAllTransactions(String channelName, int pageSize) throws InvalidArgumentException, ProposalException {
        
        Collection<TransactionDbo> transactionDbos = new ArrayList();
              
        try {

            channel = tools.getChannel(channelName);

            BlockchainInfo chainInfo = channel.queryBlockchainInfo();
            
            for (long current = chainInfo.getHeight() - 1; current > -1; --current) {
                
                BlockInfo blockInfo = channel.queryBlockByNumber(current);               
                transactionDbos.addAll(this.getTransaction(blockInfo));  
                
            }
            this.transactionPage.setTotal(transactionDbos.size());
            this.links.setLinks(channelName, "transactions", pageSize, transactionDbos.size(), 1);
            
            transactionDbos = transactionDbos.stream().sorted().limit(pageSize).collect(toList());
            this.transactionPage.setItems(transactionDbos);
            this.transactionPage.setLinks(this.links);
            this.transactionPage.setPageSize(pageSize);
            
            return ResponseEntity.ok().body(this.transactionPage);

        } catch (InvalidArgumentException | ProposalException | TransactionException | InvalidProtocolBufferException ex) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body( new FabricError().getBadRequestError(channelName+" channel was not found!") );
        }
    }

    
    @Override
    public ResponseEntity<Object> getTransactionByTxID(String channelName, String txId) throws InvalidArgumentException, ProposalException {
        
        Collection<TransactionDbo> transactionDbos;
              
        try {

            channel = tools.getChannel(channelName);
            //TransactionInfo transactionInfo = channel.queryTransactionByID(txId);
            BlockInfo blockInfo = channel.queryBlockByTransactionID(txId);  

            transactionDbos= this.getTransaction(blockInfo);
            
            return ResponseEntity.ok().body(transactionDbos);

        } catch (InvalidArgumentException | ProposalException | TransactionException | InvalidProtocolBufferException ex) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body( new FabricError().getBadRequestError("The channel or the transactionID does not exist!"));
        }
    }
    
    
    
    
    /**
     * This method returns transaction infos
     * 
     * @param blockInfo BlockInfo Object from Fabric-java-SDK
     * @return A collection of transactions
     * @throws IOException
     * @throws InvalidArgumentException
     * @throws NoSuchAlgorithmException 
     */
    private Collection<TransactionDbo> getTransaction(BlockInfo blockInfo) throws ProposalException, InvalidArgumentException, InvalidProtocolBufferException{

        log.info("");
        log.info("          Start - Get Transaction infos             ");        
        int txIndex = 0;
        Collection<TransactionDbo> transactions = new ArrayList();
        
        
        if(blockInfo.getTransactionCount()<1){
            log.info("This block has not transactions!");
            return transactions;
        }    
        
        Iterable<BlockInfo.EnvelopeInfo> envelopeInfos = blockInfo.getEnvelopeInfos();
            
        for(BlockInfo.EnvelopeInfo envelopeInfo : envelopeInfos){
                 
            
            BlockInfo
                .TransactionEnvelopeInfo
                .TransactionActionInfo tai = ((BlockInfo.TransactionEnvelopeInfo) envelopeInfo).getTransactionActionInfo(txIndex);
            
            TransactionInfo transactionInfo = this.channel.queryTransactionByID(envelopeInfo.getTransactionID());

            ProposalResponsePayload responsePayload = ProposalResponsePayload.parseFrom(tai.getProposalResponsePayload());            
            
            transactions.add(
                    new TransactionDbo(
                        envelopeInfo.getTransactionID(), 
                        transactionInfo.getValidationCode().name(), 
                        responsePayload.getProposalHash().toStringUtf8(),
                        envelopeInfo.getCreator().getMspid(), 
                        tai.getEndorsementInfo(0).getMspid(), 
                        tai.getChaincodeIDName(), 
                        envelopeInfo.getType().toString(), 
                        envelopeInfo.getTimestamp(), 
                        envelopeInfo.getChannelId()
                                      )
                            );
            
        }
            
        log.info("");
        log.info("          Start - Get Transaction infos             ");            
        return transactions;

    }
    

}
