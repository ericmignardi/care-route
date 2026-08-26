package com.careroute.backend.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * The wire contract for a page. Spring Data's {@code Page} is not serialised directly
 * because its JSON shape is explicitly not contractual.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }
}
