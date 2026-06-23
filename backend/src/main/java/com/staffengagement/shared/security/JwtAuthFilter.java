package com.staffengagement.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Extracts a Bearer JWT from the {@code Authorization} header, validates it, and sets
 * the Spring Security authentication (with {@code ROLE_<role>} authorities) for the
 * request.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final StubUserStore userStore;

    public JwtAuthFilter(JwtTokenProvider tokenProvider, StubUserStore userStore) {
        this.tokenProvider = tokenProvider;
        this.userStore = userStore;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (tokenProvider.isValid(token)) {
                String username = tokenProvider.subject(token);
                List<String> roles = tokenProvider.roles(token);
                var authorities = roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(username, null, authorities));
            }
        }
        chain.doFilter(request, response);
    }
}