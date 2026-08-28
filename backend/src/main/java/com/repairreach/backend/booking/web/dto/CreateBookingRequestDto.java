package com.repairreach.backend.booking.web.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateBookingRequestDto(
    @JsonAlias({"fullName", "customerName"})
    String customerName,

    @JsonAlias({"phoneNumber", "customerPhone"})
    String customerPhone,

    UUID serviceId,

    @JsonAlias({"locationAddress", "serviceLocation", "address"})
    String locationAddress,

    String problemDescription,

    String requestedDate,

    @JsonAlias({"requestedSlotId", "slotId"})
    String slotId,

    String slotStartTime,

    String slotEndTime
) {
    @JsonIgnore
    public String getEffectiveName() {
        return customerName != null ? customerName : "";
    }

    @JsonIgnore
    public String getEffectivePhone() {
        return customerPhone != null ? customerPhone : "";
    }

    @JsonIgnore
    public String getEffectiveSlotId() {
        return slotId != null ? slotId : "";
    }
}
