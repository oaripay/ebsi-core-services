

package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Collection;
import lombok.Data;
import xyz.ebsi.ec.fabric.dbo.TransactionDbo;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
public class TransactionPage {
    
    @Schema(name = "items")
    Collection<TransactionDbo> elements;
    
    @Schema(example = "13")
    private int total;

    @Schema(example = "1")
    private int pageSize; 
    
    private Links links;
}
