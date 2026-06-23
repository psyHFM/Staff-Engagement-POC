package com.staffengagement.shared.api;

import java.util.List;

/**
 * A page of results for offset-based pagination (content + window + total).
 */
public record Paged<T>(List<T> content, long offset, int limit, long total) {
}