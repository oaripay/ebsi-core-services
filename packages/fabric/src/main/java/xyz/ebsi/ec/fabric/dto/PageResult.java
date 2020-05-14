
package xyz.ebsi.ec.fabric.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Collection;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Data
@NoArgsConstructor
public class PageResult<T> {

    @Schema(name = "items")
    Collection<T> items;
    
    @Schema(example = "13")
    private int total;

    @Schema(example = "2")
    private int pageSize; 
    
    private Links links;
    
}
