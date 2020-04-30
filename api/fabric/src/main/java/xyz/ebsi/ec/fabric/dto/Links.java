
package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
@Schema(name = "links")
public class Links {

    @Schema(example = "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page[after]=0&page[size]=2")
    private String first;
    
    @Schema(example = "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page[after]=0&page[size]=2")
    private String prev;
    
    @Schema(example = "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page[after]=0&page[size]=2")
    private String next;
    
    @Schema(example = "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page[after]=0&page[size]=2")
    private String last;
    
    public void setLinks(String channelName, String collectionName, int pageSize, int totalElement, int currentPageNumber){
        
        String ledger="/ledger/v1/blockchains/fabric/channels/";
        String pageNumber="?page[number]=";
        String sizePage="&page[size]=";
        
        int lastPageNumber = (totalElement/pageSize);
        this.first="/ledger/v1/blockchains/fabric/channels/"+channelName+"/"+collectionName+"?page[number]=1&page[size]="+pageSize;
        
        
        if(totalElement<pageSize){
            this.last="";
            this.prev="";
            this.next="";
        }else{
            this.last=ledger+channelName+"/"+collectionName+pageNumber+lastPageNumber+sizePage+pageSize;
            this.next=ledger+channelName+"/"+collectionName+pageNumber+(currentPageNumber+1)+sizePage+pageSize;
            this.prev=ledger+channelName+"/"+collectionName+pageNumber+(currentPageNumber-1)+sizePage+pageSize; 
        }
        
    }
}
