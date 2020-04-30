
package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "Hyperledger Fabric credential")
public class IdentityDto implements Serializable{
    
     private static final long SERIALIZATION_ID = 2L;

     @Schema(example = "MspCa01Admin",description = "The user name")
     private String userName;
        
     @Schema(example = "MspCa01AdminPw",description = "The user Password")
     private String password;
     
     
             
}
