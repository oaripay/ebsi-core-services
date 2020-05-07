
package xyz.ebsi.ec.fabric.dbo;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Collection;
import java.util.Date;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(name = "Hyperledger Fabric Block")
public class BlockDbo implements Comparable<BlockDbo>{
    
    public BlockDbo(long blocknum, String prevHash, String blockHash, String dataHash, int txCount){
    
        this.blocknum  = blocknum;
        this.prevHash  = prevHash;
        this.blockHash = blockHash;
        this.dataHash  = dataHash;
        this.txCount   = txCount;
    }
    
    @Schema(example = "1", description = "Block number")
    private long blocknum;
    
    @Schema(example = "2", description = "Transaction count")
    private int txCount;
    
    @Schema(example = "0355a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b04555", description = "Block hash")
    private String blockHash;
    
    @Schema(example = "af44ccf332547c6bf8197bf9470be0094ab151a15661935330bc191b6858b63a77", description = "Previous block hash")
    private String prevHash;
    
    @Schema(example = "0355a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b04555", description = "Data hash")
    private String dataHash;
    
    @Schema(example = "2020-03-23T15:26:16.236Z", description = "Time of creation")
    private Date createdTime;
   
    @ArraySchema(schema = @Schema(example = "f76ec19619ed05df3d97baf44ccf332547c6bf8197bf9470be0094ab1ef292a3", description = "Transactions hash") )
    private Collection<String> txHash;
    
    @Schema(example = "ebsichannel", description = "Channel name")
    private String channelName;

    @Override
    public int compareTo(BlockDbo block) {
        if(this.getBlocknum()==block.getBlocknum()) return 0;
        if(this.getBlocknum()>block.getBlocknum()) return 1;
        return -1;       
    }



}
