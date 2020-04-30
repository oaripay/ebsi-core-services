/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package xyz.ebsi.ec.fabric.security;


import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import xyz.ebsi.ec.fabric.config.Parameters;

/**
 *
 * @author jeanmathieutchamdjeu
 */
public class JwtAuthorizationFilter extends BasicAuthenticationFilter{
    
    public JwtAuthorizationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader(Parameters.HEADER_STRING);

        if (header == null || !header.startsWith(Parameters.TOKEN_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        UsernamePasswordAuthenticationToken authentication = getAuthentication(request);

        SecurityContextHolder.getContext().setAuthentication(authentication);
        chain.doFilter(request, response);
    }
    
    
    //===================================================================================
    //Read the JWT from the Authorization header, and then uses JWT to validate the token
    //===================================================================================
    private UsernamePasswordAuthenticationToken getAuthentication(HttpServletRequest request) throws UnsupportedEncodingException {    
    
        String token = request.getHeader(Parameters.HEADER_STRING);
        if (token != null) {
            
            Jws<Claims> claims = Jwts.parser()
                     .setSigningKey(Parameters.SECRET.getBytes(StandardCharsets.UTF_8))
                     .parseClaimsJws(token.replace(Parameters.TOKEN_PREFIX, "")
                     );

            if (claims != null) {
         
                return new UsernamePasswordAuthenticationToken(claims.getBody().get("userName"),  claims.getBody().get("password"));
            }
            return null;
        }
        return null;
    }
}
