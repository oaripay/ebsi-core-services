
package xyz.ebsi.ec.fabric.services;

import org.springframework.http.ResponseEntity;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
public interface ChannelServices {
    
    ResponseEntity<Object> getAllchannels();
    
    ResponseEntity<Object> getChannel(String channelName);
}
