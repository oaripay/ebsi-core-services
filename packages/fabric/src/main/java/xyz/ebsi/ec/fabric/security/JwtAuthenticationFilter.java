/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package xyz.ebsi.ec.fabric.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import xyz.ebsi.ec.fabric.config.Parameters;
import xyz.ebsi.ec.fabric.dbo.IdentityDbo;
import xyz.ebsi.ec.fabric.dto.IdentityDto;

/**
 *
 * @author Tchamdjeu Jean Mathieu
 */
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {

        try {            
            IdentityDto authRequest = new ObjectMapper().readValue(request.getReader(), IdentityDto.class);
            
            UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(authRequest.getUserName(), authRequest.getPassword());
            
            setDetails(request, token);

            return this.getAuthenticationManager().authenticate(token);
        } catch (IOException ex) {
            throw new InternalAuthenticationServiceException("Failed to authenticate because", ex);
        }
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {

        String token = Jwts.builder()
                .setSubject(((IdentityDbo) authResult.getPrincipal()).getUsername() + ((IdentityDbo) authResult.getPrincipal()).getEmail())
                .setExpiration(new Date(System.currentTimeMillis() + Parameters.EXPIRATION_TIME))
                .claim("userName", ((IdentityDbo) authResult.getPrincipal()).getUsername())
                .claim("password", ((IdentityDbo) authResult.getPrincipal()).getPassword())
                .signWith(SignatureAlgorithm.HS256, Parameters.SECRET.getBytes(StandardCharsets.UTF_8))
                .compact();

        response.addHeader(Parameters.HEADER_STRING, Parameters.TOKEN_PREFIX + token);
    }

}
