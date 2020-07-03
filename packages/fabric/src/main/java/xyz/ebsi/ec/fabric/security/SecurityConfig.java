package xyz.ebsi.ec.fabric.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import xyz.ebsi.ec.fabric.config.Parameters;





@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    
    @Bean
    public AuthenticationProvider authenticationProvider(){
        return new AuthenticationProvider();
    }
    
    
    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.authenticationProvider(authenticationProvider());
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthFilter() throws Exception {
    
        JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter();

        jwtAuthenticationFilter.setRequiresAuthenticationRequestMatcher(new AntPathRequestMatcher(Parameters.SIGN_UP_URL, "POST"));
        jwtAuthenticationFilter.setAuthenticationManager(authenticationManagerBean());
            
        return jwtAuthenticationFilter;
      
    }
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.cors().disable();
        http.csrf().disable();
        http.sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);
        http.headers().httpStrictTransportSecurity().disable();
    }

}
