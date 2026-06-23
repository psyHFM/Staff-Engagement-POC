package com.staffengagement.shared.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * POC security stub: stateless Bearer JWT + RBAC. The login endpoint is public; all
 * other {@code /api/v1/**} endpoints require authentication. {@code @PreAuthorize}
 * (method security) is enabled for role-based checks.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AuthErrorHandlers authErrorHandlers;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, AuthErrorHandlers authErrorHandlers) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authErrorHandlers = authErrorHandlers;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(authErrorHandlers.authenticationEntryPoint())
                        .accessDeniedHandler(authErrorHandlers.accessDeniedHandler()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}