package xyz.ebsi.ec.fabric.services;


import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import static java.util.stream.Collectors.toList;
import javax.annotation.Resource;
import org.apache.commons.codec.binary.Hex;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hyperledger.fabric.sdk.BlockInfo;
import org.hyperledger.fabric.sdk.BlockchainInfo;
import org.hyperledger.fabric.sdk.Channel;
import org.hyperledger.fabric.sdk.SDKUtils;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.hyperledger.fabric.sdk.exception.TransactionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import xyz.ebsi.ec.fabric.config.Tools;
import xyz.ebsi.ec.fabric.dbo.BlockDbo;
import xyz.ebsi.ec.fabric.dbo.HfClient;
import xyz.ebsi.ec.fabric.dto.Links;
import xyz.ebsi.ec.fabric.dto.PageResult;
import xyz.ebsi.ec.fabric.exception.FabricError;

@Service
public class BlockServicesImpl implements BlockServices {

    private static final Logger log = LogManager.getLogger(BlockServicesImpl.class);    
    
    
    @Resource(name = "hlfClient")
    HfClient hlfClient;

    @Autowired
    Tools tools;
    
    PageResult<BlockDbo> blockPage = new PageResult();
    
    Links links = new Links();

    /**
     *
     * @param channelName
     * @param pageSize
     * @return
     * @throws InvalidArgumentException
     * @throws ProposalException
     */
    @Override
    public ResponseEntity<Object> getAllBlocks(String channelName, int pageSize) throws InvalidArgumentException, ProposalException {

        Collection<BlockDbo> blocks = new ArrayList<>();

        try {

            Channel channel = tools.getChannel(channelName);

            BlockchainInfo chainInfo = channel.queryBlockchainInfo();
            for (long current = chainInfo.getHeight() - 1; current > -1; --current) {

                BlockInfo blockInfo = channel.queryBlockByNumber(current);

                blocks.add(this.getBlock(blockInfo));

            }
            blockPage.setTotal(blocks.size());
            this.links.setLinks(channelName, "blocks", pageSize, blocks.size(), 1);
            
            blocks = blocks.stream().sorted().limit(pageSize).collect(toList());
            
            blockPage.setItems(blocks);
            blockPage.setLinks(links);
            blockPage.setPageSize(pageSize);
            
            return ResponseEntity.ok().body(blockPage);
            
        } catch (IOException | InvalidArgumentException | ProposalException | TransactionException ex) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body( new FabricError().getBadRequestError(channelName+" channel does not exist yet!") );
        }
        
    }

    /**
     *This method returns a specific block of data
     * 
     * @param number The number of the block
     * @param channelName Channel name
     * @return Block Object
     * @throws InvalidArgumentException
     * @throws ProposalException
     */
    @Override
    public ResponseEntity<Object> getBlockBynumber(String channelName, long number) throws InvalidArgumentException, ProposalException {

        BlockDbo block;
        try {

            Channel channel = tools.getChannel(channelName);
            BlockInfo blockInfo = channel.queryBlockByNumber(number);
            block = this.getBlock(blockInfo);

        } catch (IOException | InvalidArgumentException | ProposalException | TransactionException  ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body( new FabricError().getNotFoundError("Block "+number+" was not found!") );
    
        }
        return ResponseEntity.ok().body(block);
    }


    /**
     * This method returns a BlockDbo object
     *
     * @param blockInfo BlockInfo Object
     * @return BlockDbo object
     * @throws IOException
     * @throws InvalidArgumentException
     */
    private BlockDbo getBlock(BlockInfo blockInfo) throws IOException, InvalidArgumentException{

        
        log.info("");
        log.info("          Start - Get block infos             ");
        BlockDbo block;
        try {
            block = new BlockDbo(
                    blockInfo.getBlockNumber(),
                    Hex.encodeHexString(blockInfo.getPreviousHash()),
                    Hex.encodeHexString(SDKUtils.calculateBlockHash(this.hlfClient.getInstance(), blockInfo.getBlockNumber(), blockInfo.getPreviousHash(), blockInfo.getDataHash())),
                    Hex.encodeHexString(blockInfo.getDataHash()),
                    blockInfo.getTransactionCount()
            );
            
            log.info("Block number: %s", blockInfo.getBlockNumber());
            
            //Set the channel name
            block.setChannelName(blockInfo.getChannelId());

            //Get transactions infos
            Collection<String> txIds = new ArrayList<>();

            Iterable<BlockInfo.EnvelopeInfo> transactionInfos = blockInfo.getEnvelopeInfos();
            
            
            transactionInfos.forEach(infos -> {
                                
                txIds.add(infos.getTransactionID());
                block.setCreatedTime(infos.getTimestamp());

            });
            
            //Get transactions infos END
            block.setTxHash(txIds);
                        
            log.info("");
            log.info("          END - Get block infos             ");            
            return block;

        } catch (IOException | InvalidArgumentException ex) {
            log.warn(" Can't build a new Block Object!");
            throw new IOException("Can't build a new Block Object!");
        }

    }

}
