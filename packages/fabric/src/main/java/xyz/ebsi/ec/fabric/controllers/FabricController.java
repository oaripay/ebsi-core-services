
package xyz.ebsi.ec.fabric.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.ebsi.ec.fabric.dbo.BlockDbo;
import xyz.ebsi.ec.fabric.dbo.TransactionDbo;
import xyz.ebsi.ec.fabric.dto.BlockPage;
import xyz.ebsi.ec.fabric.dto.TransactionPage;
import xyz.ebsi.ec.fabric.services.BlockServices;
import xyz.ebsi.ec.fabric.services.ChannelServices;
import xyz.ebsi.ec.fabric.services.TransactionServices;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */

@RestController
@RequestMapping("/ledger/v1/blockchains/fabric/")
@Tag(name = "Fabric", description = "Hyperledger Fabric REST APIs")
public class FabricController {
    
    @Autowired
    BlockServices blockServices;
    
    @Autowired
    TransactionServices transactionServices;
    
    @Autowired
    ChannelServices channelServices;
    
    

    
    
    
    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success",
                             content = @Content( array = @ArraySchema(schema = @Schema(example = "ebsichannel" )  ) )
                )
            },             
            summary = "Returns a list of all the available EBSI Fabric channels.",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )    
    @GetMapping("/channels")
    public ResponseEntity<Object> getAllChannels(){
    
        return this.channelServices.getAllchannels();
    }
    
    
    
    

    @Operation(
            responses = {
                @ApiResponse(responseCode = "204", 
                             description ="Success. Channel exists."
                )
            },             
            summary = "Check if channel exists",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )     
    @GetMapping("/channels/{channel}")
    public ResponseEntity<Object> getChannel(
            @Parameter(example = "ebsichannel", description = "Fabric channel name.")
            @PathVariable(value = "channel") String channel
    ){
        
        return this.channelServices.getChannel(channel);
    }
    
    
    
    

    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success.",
                             content = @Content( array = @ArraySchema(schema = @Schema(implementation = BlockPage.class)  ) )
                )
            },             
            summary = "Get all blocks.",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )      
    @GetMapping("/channels/{channel}/blocks")
    public ResponseEntity<Object> getAllBlocks(
            @Parameter(description = "Cursor that points to the start of the page of data that has been returned.")
            @RequestParam(name = "page[before]" ,required = false) String pageBefore,      
            
            @Parameter(description = "Cursor that points to the end of the page of data that has been returned.")
            @RequestParam(name = "page[after]" ,required = false) String pageAfter,
            
            @Parameter( description = "Defines the maximum number of objects that may be returned.")
            @RequestParam(name = "pageSize" ,required = false) int pageSize, 
            
            @Parameter(example = "ebsichannel", description = "Fabric channel name.")
            @PathVariable(value = "channel") String channel
    ) throws InvalidArgumentException, ProposalException { 
        
        return this.blockServices.getAllBlocks(channel, pageSize);
    }
    
    

    

    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success.",
                             content = @Content(schema = @Schema(implementation = BlockDbo.class)  )
                )
            },             
            summary = "Get block by number",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )     
    @GetMapping("/channels/{channel}/blocks/{blockNumber}")
    public ResponseEntity<Object> getBlock(
            @Parameter(example = "ebsichannel", description = "Fabric channel name.")
            @PathVariable(value = "channel") String channel, 
            
            @Parameter(example = "1", description = "Block number")
            @PathVariable(value = "blockNumber") long blockNumber            
    )throws InvalidArgumentException, ProposalException{
   
        return this.blockServices.getBlockBynumber(channel, blockNumber);

    }
    
    
    
    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success.",
                             content = @Content(schema = @Schema(implementation = TransactionPage.class )  )
                )
            },             
            summary = "Get all transactions details",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )       
    @GetMapping("/channels/{channel}/transactions")
    public ResponseEntity<Object> getAllTransactions(
            @Parameter(description = "Cursor that points to the start of the page of data that has been returned.")
            @RequestParam(name = "page[before]" ,required = false) String pageBefore,      
            
            @Parameter(description = "Cursor that points to the end of the page of data that has been returned.")
            @RequestParam(name = "page[after]" ,required = false) String pageAfter,
            
            @Parameter( description = "Defines the maximum number of objects that may be returned.")
            @RequestParam(name = "pageSize" ,required = false) int pageSize,             
                        
            @Parameter(example = "ebsichannel", description = "Fabric channel name.")
            @PathVariable(value = "channel") String channel    
    ) throws InvalidArgumentException, ProposalException{
    
        return this.transactionServices.getAllTransactions(channel, pageSize);
    
    }
    
    
    
    
    
    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success.",
                             content = @Content(schema = @Schema(implementation = TransactionDbo.class)  )
                )
            },             
            summary = "Get a specific transaction details",
            security = {
                @SecurityRequirement(name = "Authorization")
            }
    )     
    @GetMapping("/channels/{channel}/transactions/{transactionId}")
    public ResponseEntity<Object> getTransactionByTxId(
            @Parameter(example = "ebsichannel", description = "Fabric channel name.")
            @PathVariable(value = "channel") String channel, 
            
            @Parameter(example = "e962fbd751fe3c5f53a5b50c6516187ad6b8aa1a7e2a9ec56d714ed3ae484ea2", description = "Transaction Id")
            @PathVariable(value = "transactionId") String transactionId     
    ) throws InvalidArgumentException, ProposalException{
    
        return this.transactionServices.getTransactionByTxID(channel, transactionId);
    }
    
}
