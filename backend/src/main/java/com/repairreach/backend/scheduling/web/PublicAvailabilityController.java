package com.repairreach.backend.scheduling.web;

import com.repairreach.backend.scheduling.application.SchedulingEngine;
import com.repairreach.backend.scheduling.web.dto.AvailabilitySlotsResponseDto;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/availability")
public class PublicAvailabilityController {

    private final SchedulingEngine schedulingEngine;

    public PublicAvailabilityController(SchedulingEngine schedulingEngine) {
        this.schedulingEngine = schedulingEngine;
    }

    @GetMapping("/slots")
    public ResponseEntity<AvailabilitySlotsResponseDto> getSlots(
        @RequestParam(value = "serviceId", required = false) String serviceIdStr,
        @RequestParam(value = "date", required = false) String dateStr
    ) {
        List<InvalidParamDto> errors = new ArrayList<>();

        if (serviceIdStr == null || serviceIdStr.isBlank()) {
            errors.add(new InvalidParamDto("serviceId", "Service ID is required", serviceIdStr));
        }

        if (dateStr == null || dateStr.isBlank()) {
            errors.add(new InvalidParamDto("date", "Date is required (format: YYYY-MM-DD)", dateStr));
        }

        UUID serviceId = null;
        if (serviceIdStr != null && !serviceIdStr.isBlank()) {
            try {
                serviceId = UUID.fromString(serviceIdStr);
            } catch (IllegalArgumentException e) {
                errors.add(new InvalidParamDto("serviceId", "Invalid UUID format for serviceId", serviceIdStr));
            }
        }

        LocalDate date = null;
        if (dateStr != null && !dateStr.isBlank()) {
            try {
                date = LocalDate.parse(dateStr);
            } catch (DateTimeParseException e) {
                errors.add(new InvalidParamDto("date", "Invalid date format. Expected YYYY-MM-DD", dateStr));
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationException("Invalid availability query parameters", errors);
        }

        AvailabilitySlotsResponseDto response = schedulingEngine.calculateSlots(serviceId, date);
        return ResponseEntity.ok(response);
    }
}
