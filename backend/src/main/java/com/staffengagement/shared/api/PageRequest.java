package com.staffengagement.shared.api;

/**
 * Offset-based pagination request ({@code api-standards.yaml}: {@code offset} /
 * {@code limit}, default limit 20). Used by read-oriented contracts.
 */
public record PageRequest(int offset, int limit) {

    public PageRequest {
        if (offset < 0) {
            offset = 0;
        }
        if (limit <= 0) {
            limit = 20;
        }
    }

    public static PageRequest of(int offset, int limit) {
        return new PageRequest(offset, limit);
    }
}