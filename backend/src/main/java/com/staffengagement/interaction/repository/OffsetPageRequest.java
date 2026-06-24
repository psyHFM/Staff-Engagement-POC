package com.staffengagement.interaction.repository;

import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Offset-based {@link Pageable} for the Interaction module.
 *
 * <p>The frozen {@code com.staffengagement.shared.api.PageRequest} is offset-based
 * ({@code offset} / {@code limit}), but Spring Data's {@link Pageable} is page-number
 * based. This adapter carries the true offset through to the query so the REST list
 * endpoint honours {@code offset} exactly (per {@code api-standards.yaml}) rather than
 * rounding to a page boundary. Module-local so it never leaks to the controller layer
 * (ArchUnit: controllers must not depend on {@code ..repository..}).
 */
public final class OffsetPageRequest implements Pageable {

    private final long offset;
    private final int limit;
    private final Sort sort;

    public OffsetPageRequest(long offset, int limit, Sort sort) {
        this.offset = Math.max(0, offset);
        this.limit = limit;
        this.sort = sort == null ? Sort.unsorted() : sort;
    }

    @Override
    public int getPageNumber() {
        return limit == 0 ? 0 : (int) (this.offset / limit);
    }

    @Override
    public Pageable withPage(int pageNumber) {
        return new OffsetPageRequest((long) pageNumber * limit, limit, sort);
    }

    @Override
    public int getPageSize() {
        return limit;
    }

    @Override
    public long getOffset() {
        return offset;
    }

    @Override
    public Sort getSort() {
        return sort;
    }

    @Override
    public Pageable next() {
        return new OffsetPageRequest(offset + limit, limit, sort);
    }

    @Override
    public Pageable previousOrFirst() {
        return offset == 0 ? first() : new OffsetPageRequest(Math.max(0, offset - limit), limit, sort);
    }

    @Override
    public Pageable first() {
        return new OffsetPageRequest(0, limit, sort);
    }

    @Override
    public boolean hasPrevious() {
        return offset > 0;
    }

    @Override
    public Optional<Pageable> toOptional() {
        return Optional.of(this);
    }
}