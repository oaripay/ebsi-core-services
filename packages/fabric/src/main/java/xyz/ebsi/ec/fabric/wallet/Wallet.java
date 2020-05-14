

package xyz.ebsi.ec.fabric.wallet;

import java.io.File;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import lombok.NoArgsConstructor;
import xyz.ebsi.ec.fabric.config.Parameters;
import xyz.ebsi.ec.fabric.dbo.IdentityDbo;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
@NoArgsConstructor
public class Wallet {

    
    /**
     * Serialize AppUser object to file
     *
     * @param user The object to be serialized
     * @throws IOException
     */
    
    public void serialize(IdentityDbo user) throws IOException {
        
        File dir = new File(Parameters.WALLET_DIR);
        dir.mkdirs();       
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(
                Paths.get(Parameters.WALLET_DIR+user.getName() + ".jso")))) {
            oos.writeObject(user);
        }
    }
    
    
    /**
     * Serialize AppUser object from file
     *
     * @param name The name of the user. Used to build file name ${name}.jso
     * @return
     */
    
    public boolean tryDeserialize(String name) {       
      
        return Files.exists(Paths.get(Parameters.WALLET_DIR+name + ".jso"));
    } 
    
    
    
    /**
     * Deserialize AppUser object from file
     *
     * @param name The name of the user. Used to build file name ${name}.jso
     * @return
     * @throws IOException
     * @throws ClassNotFoundException
     */
    public IdentityDbo deserialize(String name) throws IOException, ClassNotFoundException  {
        
        try (ObjectInputStream decoder = new ObjectInputStream(
                Files.newInputStream(Paths.get(Parameters.WALLET_DIR+name + ".jso"))
          )) {
            return (IdentityDbo) decoder.readObject();
        }
    }  
}
