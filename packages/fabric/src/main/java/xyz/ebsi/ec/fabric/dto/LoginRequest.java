
package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginRequest {
    
    @Schema(example = "MspCa01Admin")
    private String username;
    
    @Schema(example = "MspCa01AdminPw")
    private String password;
}
