package com.staffengagement.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT stub configuration bound from {@code staffengagement.security.jwt.*}.
 */
@ConfigurationProperties(prefix = "staffengagement.security.jwt")
public record JwtProperties(String secret, String issuer, int expirationMinutes) {
}