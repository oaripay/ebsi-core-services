
package xyz.ebsi.ec.fabric.dbo;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Data;


@Data
@AllArgsConstructor
@Schema(name = "Hyperledger Fabric Transaction")
public class TransactionDbo implements Comparable<TransactionDbo>{
    
    @Schema(example = "f76ec19619ed05df3d97baf44ccf332547c6bf8197bf9470be0094ab1ef292a3", description = "Transaction hash")
    private String txHash;
    
    @Schema(example = "VALID", description = "Validation code")
    private String validatioCode;
    
    @Schema(example = "008df9b7662d2dd1baeeda1dbdf428f72f7b823953a1bc1ff9c6afdc689fb648", description = "Hash of the proposal message")
    private String payloadProposalHash;
    
    @Schema(example = "EbsiNode2MSP", description = "User or node who submitted the transaction")
    private String creatorMspId;
    
    @Schema(example = "EbsiNode1MSP", description = "MspId of the endorser node")
    private String endorserMspId;
    
    @Schema(example = "taxudchaincode", description = "Chaincode name")
    private String chaincodeName;
    
    @Schema(example = "ENDORSER_TRANSACTION", description = "Transaction type")
    private String type;
    
    @Schema(example = "2020-03-23T15:26:16.236Z", description = "Transaction creation time")
    private Date createdAT;
    
    @Schema(example = "ebsichannel", description = "Channel name")
    private String channelName;

    @Override
    public int compareTo(TransactionDbo transaction) {
        if(this.getCreatedAT() == transaction.getCreatedAT()) return 0;
        if(this.getCreatedAT().before(transaction.getCreatedAT()) ) return 1;
        return -1;          
    }
    
    
}
