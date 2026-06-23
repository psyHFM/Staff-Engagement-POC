package com.staffengagement.interaction.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

/**
 * BDD unit tests for {@link OffsetPageRequest} — the offset-based {@code Pageable}
 * adapter. Drives every branch (page-number derivation, next/previous/first
 * navigation, the offset==0 edge of {@code previousOrFirst}, null-sort
 * normalisation, and {@code withPage}) so the navigation paths are mutation-covered.
 */
class OffsetPageRequestTest {

    @Test
    void exposesOffsetLimitSortAndDerivedPageNumber() {
        // Given — a page window starting at offset 40, limit 20
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        var request = new OffsetPageRequest(40, 20, sort);

        // When / Then
        assertThat(request.getOffset()).isEqualTo(40);
        assertThat(request.getPageSize()).isEqualTo(20);
        assertThat(request.getPageNumber()).isEqualTo(2); // 40 / 20
        assertThat(request.getSort()).isEqualTo(sort);
        assertThat(request.hasPrevious()).isTrue();
        assertThat(request.toOptional()).isPresent().get().isSameAs(request);
    }

    @Test
    void nextAdvancesOffsetByTheLimit() {
        // Given
        var request = new OffsetPageRequest(40, 20, Sort.by("createdAt"));

        // When
        var next = request.next();

        // Then
        assertThat(next.getOffset()).isEqualTo(60);
        assertThat(next.getPageSize()).isEqualTo(20);
    }

    @Test
    void previousOrFirstStepsBackWhenOffsetIsPositive() {
        // Given — offset 40 has a previous window
        var request = new OffsetPageRequest(40, 20, Sort.unsorted());

        // When
        var previous = request.previousOrFirst();

        // Then
        assertThat(previous.getOffset()).isEqualTo(20);
    }

    @Test
    void previousOrFirstReturnsFirstWhenAlreadyAtZero() {
        // Given — offset 0 has no previous window
        var request = new OffsetPageRequest(0, 20, Sort.unsorted());

        // When
        var previous = request.previousOrFirst();

        // Then — falls back to first() (offset 0)
        assertThat(previous.getOffset()).isZero();
        assertThat(previous.first().getOffset()).isZero();
    }

    @Test
    void withPageRebuildsOffsetFromPageNumberTimesLimit() {
        // Given
        var request = new OffsetPageRequest(40, 20, Sort.by("createdAt"));

        // When
        var page0 = request.withPage(0);
        var page3 = request.withPage(3);

        // Then
        assertThat(page0.getOffset()).isZero();
        assertThat(page3.getOffset()).isEqualTo(60); // 3 * 20
    }

    @Test
    void nullSortIsNormalisedToUnsorted() {
        // Given / When
        var request = new OffsetPageRequest(0, 20, null);

        // Then
        assertThat(request.getSort()).isEqualTo(Sort.unsorted());
    }
}