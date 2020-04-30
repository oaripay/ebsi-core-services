

package xyz.ebsi.ec.fabric.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FabricError {

    private String title;
    
    private int status;
    
    private String detail;
    
    public FabricError getInternalError(String detail){    
        return new FabricError("Internal server error", 500, detail);
    }
    
    public FabricError getNotFoundError(String detail){
        return new FabricError("Not Found", 404, detail);
    }
    
    public FabricError getBadRequestError(String detail){
        return new FabricError("Bad Raquest", 400, detail);
    }
}
