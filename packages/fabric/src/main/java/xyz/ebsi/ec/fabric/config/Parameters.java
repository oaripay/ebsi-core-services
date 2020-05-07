package xyz.ebsi.ec.fabric.config;


import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import lombok.Data;
import org.hyperledger.fabric.sdk.Channel;


/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
public class Parameters {


    private Map<String, Channel> channelMap = new HashMap<>();
    
    public static Collection<String> channels = new HashSet();   

    //JWT config
    public static final String SECRET = "This is Fabric api provided by EBSI";
    public static final long EXPIRATION_TIME = 900000;
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";
    public static final String SIGN_UP_URL = "/ledger/v1/blockchains/fabric/login";
    
    

    public static final String TLS_CERTS_DIR ="ssl/";
    public static final String WALLET_DIR = "wallet/";
    
    
}
