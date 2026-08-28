package com.repairreach.backend.shared.exception;

import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.util.Collections;
import java.util.List;

public class SlotUnavailableException extends ProblemDetailException {

    private final List<AlternativeSlotDto> alternatives;

    public SlotUnavailableException(String message, List<AlternativeSlotDto> alternatives) {
        super(
            HttpStatus.CONFLICT,
            "SLOT_UNAVAILABLE",
            URI.create("https://api.repairreach.shop/problems/slot-unavailable"),
            message
        );
        this.alternatives = alternatives != null ? alternatives : Collections.emptyList();
    }

    public SlotUnavailableException(String message) {
        this(message, Collections.emptyList());
    }

    public List<AlternativeSlotDto> getAlternatives() {
        return alternatives;
    }
}
