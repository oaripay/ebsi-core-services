
package xyz.ebsi.ec.fabric.services;


import java.net.MalformedURLException;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.springframework.http.ResponseEntity;
import xyz.ebsi.ec.fabric.dto.IdentityDto;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
public interface IdentityServices {    
    
    ResponseEntity<Object> login(IdentityDto login)throws InvalidArgumentException, MalformedURLException;
    
}
