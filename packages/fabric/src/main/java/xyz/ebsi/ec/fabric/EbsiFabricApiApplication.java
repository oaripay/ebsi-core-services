package xyz.ebsi.ec.fabric;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.context.annotation.RequestScope;
import xyz.ebsi.ec.fabric.config.Parameters;
import xyz.ebsi.ec.fabric.dbo.HfClient;

@SpringBootApplication//(exclude = {SecurityAutoConfiguration.class})
@SecurityScheme(
        name = "Authorization",
        type = SecuritySchemeType.HTTP,
        in = SecuritySchemeIn.HEADER,
        scheme = "bearer",
        bearerFormat = "JWT"
)
@OpenAPIDefinition(
        info = @Info(
                title = "Hyperledger Fabric REST API",
                version = "1.0.0",
                description = "Collection of APIs to interact with Hyperledger Fabric Network. For write operations use the official Fabric SDK (node/java/go) as described in the Wiki.",
                license = @License(
                        name = "EUPL-1.2",
                        url = "https://joinup.ec.europa.eu/page/eupl-text-11-12"),
                 contact = @Contact(
                        name = "EBSI Support",
                        email = "CEF-EBSI-SUPPORT@ec.europa.eu",
                        url = "https://ec.europa.eu/cefdigital/wiki/display/CEFDIGITAL/ebsi"
                )
        ),
        servers = {
            @Server(url = "https://localhost:8081", description = "Local Computer Environment")
            ,
            @Server(url = "https://api.ebsi.xyz:48780", description = "EBSI Testing Environment"),
            @Server(url = "https://fabric02-0-ebsi-int-lux.intebsi.xyz:48780", description = "EBSI Integration Environment" )
        }
)
public class EbsiFabricApiApplication {

    public static void main(String[] args) {
        
        
        Parameters.channels.add("ebsichannel");
        SpringApplication.run(EbsiFabricApiApplication.class, args);
    }

    @Bean
    @RequestScope
    public HfClient hlfClient() {
        return new HfClient();
    }
}
