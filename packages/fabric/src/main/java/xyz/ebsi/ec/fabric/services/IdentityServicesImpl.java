package xyz.ebsi.ec.fabric.services;


import java.io.IOException;
import java.net.MalformedURLException;
import javax.annotation.Resource;
import org.hyperledger.fabric_ca.sdk.HFCAClient;
import org.hyperledger.fabric_ca.sdk.exception.EnrollmentException;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import xyz.ebsi.ec.fabric.config.Tools;
import xyz.ebsi.ec.fabric.dbo.HfClient;
import xyz.ebsi.ec.fabric.dbo.IdentityDbo;
import xyz.ebsi.ec.fabric.dto.IdentityDto;
import xyz.ebsi.ec.fabric.exception.FabricError;
import xyz.ebsi.ec.fabric.wallet.Wallet;

@Service
public class IdentityServicesImpl implements IdentityServices {
  
    
    @Resource(name = "hlfClient")
    HfClient hlfClient;
    
    @Autowired
    Tools tools;     

    Wallet wallet = new Wallet();

    
    /**
     * 
     * @param login Credential of the user
     * @return ResponseEntity
     * @throws InvalidArgumentException 
     * @throws MalformedURLException
     */
    @Override
    public ResponseEntity<Object> login(IdentityDto login) throws InvalidArgumentException, MalformedURLException  {

        IdentityDbo identity = new IdentityDbo();
        
        try {
            
            if( wallet.tryDeserialize(login.getUserName()) ){
                return ResponseEntity.ok().body(
                        wallet.deserialize(login.getUserName())
                );
            }


            HFCAClient caClient = Tools.getHfCaClient( System.getenv("CA_URL") );

        
        
            identity.setName(login.getUserName());
            identity.setPassword(login.getPassword());
            identity.setEnrollment(caClient.enroll(login.getUserName(), login.getPassword()));
            identity.setMspId( System.getenv("CA_MSP_ID") );
            
            wallet.serialize(identity);
            return ResponseEntity.ok().body(identity);

        } catch (EnrollmentException | InvalidArgumentException ex) {
           
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new FabricError().getBadRequestError("The user is not registered yet!")
                    );
        } catch (ClassNotFoundException | IOException ex) {
             return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new FabricError().getBadRequestError("Can't serialize or deserialize a user wallet!")
                    );
        } catch (org.hyperledger.fabric_ca.sdk.exception.InvalidArgumentException ex) {
             return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            new FabricError().getBadRequestError("Can't initialize hyperledger abric CA client!")
                    );
        } 

    }

}
