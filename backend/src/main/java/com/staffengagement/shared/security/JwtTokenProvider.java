package com.staffengagement.shared.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.List;

/**
 * Issues and validates HS256 JWTs for the POC auth stub. The signing key is base64-decoded
 * from {@link JwtProperties#secret()}. Not production auth — single shared secret.
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final String issuer;
    private final long expirationMillis;

    public JwtTokenProvider(JwtProperties properties) {
        byte[] keyBytes = Base64.getDecoder().decode(properties.secret());
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.issuer = properties.issuer();
        this.expirationMillis = properties.expirationMinutes() * 60_000L;
    }

    public String generate(String subject, List<String> roles) {
        return generate(subject, roles, null);
    }

    public String generate(String subject, List<String> roles, Long employeeId) {
        Date now = new Date();
        var builder = Jwts.builder()
                .issuer(issuer)
                .subject(subject)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMillis))
                .signWith(key);
        if (employeeId != null) {
            builder.claim("employeeId", employeeId);
        }
        return builder.compact();
    }

    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public String subject(String token) {
        return parse(token).getPayload().getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> roles(String token) {
        return parse(token).getPayload().get("roles", List.class);
    }

    public long expirationSeconds() {
        return expirationMillis / 1000L;
    }

    /**
     * Extract the employeeId from the JWT token. Returns null if not present.
     */
    public Long employeeId(String token) {
        try {
            Jws<Claims> jws = parse(token);
            Object empIdObj = jws.getPayload().get("employeeId");
            if (empIdObj instanceof Number) {
                return ((Number) empIdObj).longValue();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }
}