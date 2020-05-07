

package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Collection;
import lombok.Data;
import xyz.ebsi.ec.fabric.dbo.BlockDbo;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
public class BlockPage {

    @Schema(name = "items")
    Collection<BlockDbo> elements;
    
    @Schema(example = "13")
    private int total;

    @Schema(example = "1")
    private int pageSize; 
    
    private Links links;    
}
