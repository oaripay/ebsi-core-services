/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package xyz.ebsi.ec.fabric.services;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import xyz.ebsi.ec.fabric.config.Parameters;
import xyz.ebsi.ec.fabric.exception.FabricError;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@Service
public class ChannelServicesImpl implements ChannelServices {

    @Override
    public ResponseEntity<Object> getAllchannels() {
        return ResponseEntity.status(HttpStatus.OK).body(Parameters.channels);
    }

    
    
    @Override
    public ResponseEntity<Object> getChannel(String channelName) {
        
        if(Parameters.channels.contains(channelName)){
            return ResponseEntity.status(HttpStatus.NO_CONTENT).header("response","Success. Channel exists.").body(null);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new FabricError().getNotFoundError(channelName+" not found.")
                );
    }

}
