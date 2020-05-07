 
package xyz.ebsi.ec.fabric.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.MalformedURLException;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.ebsi.ec.fabric.dto.IdentityDto;
import xyz.ebsi.ec.fabric.services.IdentityServices;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@RestController
@RequestMapping("/ledger/v1/blockchains/fabric")
@Tag(name = "Login", description = "Login to Hyperledger Fabric REST APIs")
public class LoginController {
   
    @Autowired
    IdentityServices identityServices;    


    
    @Operation(
            responses = {
                @ApiResponse(responseCode = "200", 
                             description ="Success.",
                             content = @Content(schema = @Schema(example = "The user was successfull logged in.")  )
                )
            },             
            summary = "Login a user",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(
                            mediaType = "application/json",
                            schema=@Schema(name = "identity", implementation = IdentityDto.class)
                            )
                    
            )
    )     
    @PostMapping("login")
    public ResponseEntity<Object> login(
            @RequestBody IdentityDto identity
    ) throws InvalidArgumentException, MalformedURLException{
    
        return identityServices.login(identity);
    }
}
