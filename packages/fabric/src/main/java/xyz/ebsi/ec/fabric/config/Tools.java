package xyz.ebsi.ec.fabric.config;

import java.lang.reflect.InvocationTargetException;
import java.net.MalformedURLException;
import java.util.Properties;
import java.util.HashSet;
import java.util.Set;
import javax.annotation.Resource;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hyperledger.fabric.sdk.Channel;
import org.hyperledger.fabric.sdk.Enrollment;
import org.hyperledger.fabric.sdk.HFClient;
import org.hyperledger.fabric.sdk.exception.CryptoException;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.TransactionException;
import org.hyperledger.fabric.sdk.security.CryptoSuite;
import org.hyperledger.fabric_ca.sdk.HFCAClient;
import org.springframework.stereotype.Component;
import xyz.ebsi.ec.fabric.dbo.HfClient;
import xyz.ebsi.ec.fabric.user.FabricUserContext;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Component
public class Tools {

    private static final Logger log = LogManager.getLogger(Tools.class);   
    
    @Resource(name = "hlfClient")
    HfClient hlfClient;
    
    public static FabricUserContext enrollAdmin() throws Exception {

        HFCAClient hfcaClient = getHfCaClient( System.getenv("CA_URL") );

        FabricUserContext adminUserContext = new FabricUserContext();
        adminUserContext.setName(System.getenv("FABRIC_USERNAME")); // admin username
        adminUserContext.setAffiliation(System.getenv("ORG_NAME")); // affiliation
        Set<String> roles = new HashSet<>();
        roles.add("member");
        roles.add("admin");
        adminUserContext.setRoles(roles);
        adminUserContext.setMspId(System.getenv("CA_MSP_ID")); // org1 mspid
        Enrollment adminEnrollment = hfcaClient.enroll(System.getenv("FABRIC_USERNAME"), System.getenv("FABRIC_PASSWORD")); //pass admin username and password, adminpw is the default for fabric
        adminUserContext.setEnrollment(adminEnrollment);

        return adminUserContext;
    }
 
    
    /**
     * This method create a new instance of HFClient object
     *
     * @return HFClient object
     * @throws InvalidArgumentException
     */
    public static HFClient getHfClient() throws InvalidArgumentException {
        
        try{
            FabricUserContext userContext = Tools.enrollAdmin();
            // initialize default cryptosuite
            CryptoSuite cryptoSuite = CryptoSuite.Factory.getCryptoSuite();
            // setup the Hyperledger Fabric client
            HFClient client = HFClient.createNewInstance();
            client.setCryptoSuite(cryptoSuite);
            client.setUserContext(userContext);
            
            return client;
        }catch(ClassNotFoundException | IllegalAccessException | InstantiationException | NoSuchMethodException | InvocationTargetException | CryptoException | InvalidArgumentException ex){
            log.warn("Couldn't instantiate a new Hyperledger Fabric client: %s", ex.getLocalizedMessage());
            throw new InvalidArgumentException(ex.getLocalizedMessage());
        }catch(Exception ex){
            log.warn("Exception");
            log.warn(ex.getLocalizedMessage());
            throw new InvalidArgumentException(ex.getLocalizedMessage());        
        }
    }

    /**
     *
     * 
     * @param caUrl Certificate Authority URL
     * @return HFCAClient Object
     * @throws InvalidArgumentException
     * @throws MalformedURLException
     */
    public static HFCAClient getHfCaClient(String caUrl) throws InvalidArgumentException, MalformedURLException {

        HFCAClient caClient ;
        try {
            CryptoSuite cryptoSuite = CryptoSuite.Factory.getCryptoSuite();
            caClient = HFCAClient.createNewInstance(caUrl, null);

            caClient.setCryptoSuite(cryptoSuite);
            return caClient;

        } catch (ClassNotFoundException | IllegalAccessException | InstantiationException | NoSuchMethodException | InvocationTargetException | CryptoException | InvalidArgumentException ex) {
            log.warn("Failed to create a new Hyperledger Fabric  CAclient: %s", ex.getLocalizedMessage());
            throw new InvalidArgumentException(ex.getLocalizedMessage());
        }
    }

    /**
     *This method create PEER/ORDERER properties for a specific node
     * 
     * @param nodeName
     * @return Properties
     */
    public static Properties nodeProps(String nodeName) {

        Properties peerProperties = new Properties();

        peerProperties.setProperty("pemFile", "fabric/tlsca.pem");
        peerProperties.setProperty("trustServerCertificate", "true");
        peerProperties.setProperty("hostnameOverride", nodeName);
        peerProperties.setProperty("sslProvider", "openSSL");
        peerProperties.setProperty("negotiationType", "TLS");
        peerProperties.put("grpc.NettyChannelBuilderOption.maxInboundMessageSize",
                9000000);

        return peerProperties;

    }
    
    
    /**
     * This method initialize a new channel
     * 
     * @param channelName The channel name
     * @return Channel Object: the one from java-SDK
     * @throws InvalidArgumentException
     * @throws TransactionException 
     */
    public Channel getChannel(String channelName) throws InvalidArgumentException, TransactionException {
    
        log.info("");
        log.info("          START - getChannel()              ");
        Channel channel= null;
        
        try{
            channel = this.hlfClient.getInstance().newChannel(channelName);
            String peerName = System.getenv("PEER_NODE_NAME");
            String ordererName = System.getenv("ORDERER_NODE_NAME");
            
            log.debug(" Add a peer to channel");//Add a peer to channel
            channel.addPeer(
                    this.hlfClient.getInstance()
                            .newPeer(
                                    peerName, 
                                    System.getenv("PEER_NODE_URL"), 
                                    Tools.nodeProps(peerName)
                            )
            );
            
            log.debug(" Add a orderer to channel");//Add a orderer to channel
            channel.addOrderer(
                    this.hlfClient.getInstance()
                            .newOrderer(
                                    ordererName, 
                                    System.getenv("ORDERER_NODE_URL"), 
                                    Tools.nodeProps(ordererName)
                            )
            );
            
            log.debug(" Initialize the channel");
            channel.initialize();
            
            if(!Parameters.channels.contains(channelName)){
                Parameters.channels.add(channelName);
            }
        }catch(InvalidArgumentException ex){
            log.warn(" Invalid argument exception");
            log.warn(ex.getLocalizedMessage());
            throw new InvalidArgumentException(ex.getLocalizedMessage());
        } catch (TransactionException ex) {
            log.warn(" Transaction exception: %s", ex.getLocalizedMessage());
            throw new TransactionException(ex.getLocalizedMessage());
        }
        log.info("            END - getChannel()              "); 
        log.info("");
        return channel;
    }
}
