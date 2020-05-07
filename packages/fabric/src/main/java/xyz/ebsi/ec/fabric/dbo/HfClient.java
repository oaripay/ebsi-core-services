package xyz.ebsi.ec.fabric.dbo;



import lombok.Data;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hyperledger.fabric.sdk.HFClient;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import xyz.ebsi.ec.fabric.config.Tools;

@Data
public class HfClient {

    private static final Logger log = LogManager.getLogger(HfClient.class);
    
    private  HFClient client;

    public HFClient getInstance() {
        
        try {
            if(client==null){
                client = Tools.getHfClient();
            }
        } catch (InvalidArgumentException ex) {
            log.warn(" HfClient() - Failed cause: %s", ex.getLocalizedMessage());
        }
        
        return client;
    }

}
