
package xyz.ebsi.ec.fabric.security;

import javax.annotation.Resource;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import xyz.ebsi.ec.fabric.dbo.HfClient;
import xyz.ebsi.ec.fabric.dbo.IdentityDbo;
import xyz.ebsi.ec.fabric.dto.IdentityDto;
import xyz.ebsi.ec.fabric.services.IdentityServices;



public class AuthenticationProvider extends AbstractUserDetailsAuthenticationProvider{
    
    private static final Logger log = LogManager.getLogger(AuthenticationProvider.class);
    
    @Autowired
    IdentityServices identityServices;
    
    @Resource(name = "hlfClient")
    HfClient hlfClient;

    @Override
    protected void additionalAuthenticationChecks(UserDetails ud, UsernamePasswordAuthenticationToken upat) throws AuthenticationException {
       
    }

    @Override
    protected UserDetails retrieveUser(String string, UsernamePasswordAuthenticationToken upat) throws AuthenticationException {
        
        log.info("");
        log.info("          START - retrieveUser()             ");
        IdentityDbo identity = new IdentityDbo();        
        try{
            
            identity = (IdentityDbo)this.identityServices
                    .login(
                            new IdentityDto(
                                    upat.getPrincipal().toString(), 
                                    upat.getCredentials().toString()
                            )
                    ).getBody();
            this.hlfClient.getInstance().setUserContext(identity);
            
            log.info("");
            log.info("          END - retrieveUser()             ");
            return identity;
            
        }catch (Exception ex) {
            log.warn("Failed to retrieve a User");
            return null;
        }

    }
    
}
