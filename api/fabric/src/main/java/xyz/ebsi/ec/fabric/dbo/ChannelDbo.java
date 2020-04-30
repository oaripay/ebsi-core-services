
package xyz.ebsi.ec.fabric.dbo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.hyperledger.fabric.sdk.Channel;

@Data
@Schema(name = "Hyperledger Fabric Channel")
public class ChannelDbo {
    
    private String channelName;
    
    private Channel channel;
}
