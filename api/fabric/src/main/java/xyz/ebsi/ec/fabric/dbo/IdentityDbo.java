
package xyz.ebsi.ec.fabric.dbo;


import com.fasterxml.jackson.annotation.JsonIgnore;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Set;
import lombok.Data;
import org.hyperledger.fabric.sdk.Enrollment;
import org.hyperledger.fabric.sdk.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;


@Data
@Component
public class IdentityDbo implements User, UserDetails, Serializable{
     private static final long SERIALIZATION_ID = 1L;
     // the name of the user
     private String name;
     
     //email of the user
     private String email;
     
     // password of the user
     private String password;
             
     //the role of the user : this can be"peeradmin" or "channeladmin"
     private Set<String> roles;
     
     private String account;
     
     //to which org does he came from
     private String affiliation;
     
     
     @JsonIgnore
     private Enrollment enrollment;
     
     //the msp Id of the organization
     private String mspId;
     
     private String caName;
    
     @Override
     public String toString(){
        return "Identity{" +
                "name='" + name + '\'' +
                "\n, roles=" + roles +
                "\n, account='" + account + '\'' +
                "\n, affiliation='" + affiliation + '\'' +
                "\n, enrollment=" + enrollment +
                "\n, mspId='" + mspId + '\'' +
                '}';
            }  

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return new ArrayList<GrantedAuthority>();
    }

    @Override
    public String getUsername() {
        return getName();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

}
