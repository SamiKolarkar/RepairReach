package com.repairreach.backend.booking.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairreach.backend.assignment.application.AssignmentPolicyService;
import com.repairreach.backend.assignment.domain.Assignment;
import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.booking.domain.BookingState;
import com.repairreach.backend.booking.domain.CancellationChargeType;
import com.repairreach.backend.booking.infrastructure.BookingRepository;
import com.repairreach.backend.booking.web.dto.*;
import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.customer.application.CustomerService;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.domain.CustomerAddress;
import com.repairreach.backend.job.application.JobService;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.job.domain.JobState;
import com.repairreach.backend.notify.application.OutboxService;
import com.repairreach.backend.scheduling.application.SchedulingEngine;
import com.repairreach.backend.scheduling.domain.ScheduleEntry;
import com.repairreach.backend.scheduling.infrastructure.ScheduleEntryRepository;
import com.repairreach.backend.shared.domain.IdempotencyRecord;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.*;
import com.repairreach.backend.shared.infrastructure.IdempotencyRecordRepository;
import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import com.repairreach.backend.technician.application.TechnicianService;
import com.repairreach.backend.technician.domain.Technician;
import com.repairreach.backend.shared.security.JwtCapabilityTokenService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final ZoneId ZONE_KOLKATA = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    private final BookingRepository bookingRepository;
    private final CustomerService customerService;
    private final CatalogService catalogService;
    private final TechnicianService technicianService;
    private final AssignmentPolicyService assignmentPolicyService;
    private final SchedulingEngine schedulingEngine;
    private final JobService jobService;
    private final OutboxService outboxService;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;
    private final JwtCapabilityTokenService jwtCapabilityTokenService;
    private final ScheduleEntryRepository scheduleEntryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public BookingService(
        BookingRepository bookingRepository,
        CustomerService customerService,
        CatalogService catalogService,
        TechnicianService technicianService,
        AssignmentPolicyService assignmentPolicyService,
        SchedulingEngine schedulingEngine,
        JobService jobService,
        OutboxService outboxService,
        IdempotencyRecordRepository idempotencyRecordRepository,
        ObjectMapper objectMapper,
        JwtCapabilityTokenService jwtCapabilityTokenService,
        ScheduleEntryRepository scheduleEntryRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.customerService = customerService;
        this.catalogService = catalogService;
        this.technicianService = technicianService;
        this.assignmentPolicyService = assignmentPolicyService;
        this.schedulingEngine = schedulingEngine;
        this.jobService = jobService;
        this.outboxService = outboxService;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.objectMapper = (objectMapper != null) ? objectMapper.findAndRegisterModules() : new ObjectMapper().findAndRegisterModules();
        this.jwtCapabilityTokenService = jwtCapabilityTokenService;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @Transactional
    public BookingConfirmationResponseDto createBooking(CreateBookingRequestDto request, String idempotencyKey, String authUserId) {
        UUID businessId = TenantContext.getBusinessId();

        // 1. Check Idempotency if key is present
        String requestHash = null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            requestHash = hashPayload(request);
            Optional<IdempotencyRecord> existingRecord = idempotencyRecordRepository.findByScopeAndIdempotencyKey(
                "BOOKING_CREATE",
                idempotencyKey.trim()
            );

            if (existingRecord.isPresent()) {
                IdempotencyRecord record = existingRecord.get();
                if (!record.getRequestHash().equals(requestHash)) {
                    throw new IdempotencyConflictException(
                        "Idempotency key '" + idempotencyKey + "' has already been used with different request parameters."
                    );
                }
                try {
                    return objectMapper.readValue(record.getResponseBody(), BookingConfirmationResponseDto.class);
                } catch (Exception e) {
                    log.error("Failed to deserialize idempotency cached response: {}", e.getMessage());
                }
            }
        }

        // 2. Comprehensive Input Validation
        List<InvalidParamDto> validationErrors = new ArrayList<>();

        if (request.getEffectiveName().trim().length() < 2) {
            validationErrors.add(new InvalidParamDto("customerName", "Customer full name is required and must be at least 2 characters", request.customerName()));
        }

        if (request.getEffectivePhone().isBlank()) {
            validationErrors.add(new InvalidParamDto("customerPhone", "Customer phone number is required", request.customerPhone()));
        }

        if (request.serviceId() == null) {
            validationErrors.add(new InvalidParamDto("serviceId", "Service selection is required", null));
        }

        if (request.locationAddress() == null || request.locationAddress().trim().length() < 5) {
            validationErrors.add(new InvalidParamDto("locationAddress", "Service address is required and must be at least 5 characters", request.locationAddress()));
        }

        if (request.problemDescription() == null || request.problemDescription().trim().isEmpty()) {
            validationErrors.add(new InvalidParamDto("problemDescription", "Problem description is required", request.problemDescription()));
        }

        if (request.requestedDate() == null || request.requestedDate().isBlank()) {
            validationErrors.add(new InvalidParamDto("requestedDate", "Requested date is required (format: YYYY-MM-DD)", request.requestedDate()));
        }

        if (request.getEffectiveSlotId().isBlank()) {
            validationErrors.add(new InvalidParamDto("slotId", "Explicit time slot selection is required", request.slotId()));
        }

        if (!validationErrors.isEmpty()) {
            throw new ValidationException("Booking request validation failed", validationErrors);
        }

        LocalDate bookingDate;
        try {
            bookingDate = LocalDate.parse(request.requestedDate());
        } catch (DateTimeParseException e) {
            throw new ValidationException(
                "Invalid date format",
                List.of(new InvalidParamDto("requestedDate", "Invalid date format. Expected YYYY-MM-DD", request.requestedDate()))
            );
        }

        // 3. Resolve Service Offering
        ServiceOffering service = catalogService.getServiceById(request.serviceId());
        if (service.getCode().toUpperCase().contains("MOBILE")) {
            throw new ValidationException(
                "Mobile phone repair is strictly excluded",
                List.of(new InvalidParamDto("serviceId", "Mobile phone repair is strictly excluded", request.serviceId()))
            );
        }

        // 4. Resolve Customer & Address
        Customer customer = customerService.findOrCreateCustomer(
            businessId,
            authUserId,
            request.getEffectiveName(),
            request.getEffectivePhone(),
            "customerPhone",
            "customerName"
        );
        CustomerAddress address = customerService.findOrCreateAddress(
            customer,
            request.locationAddress(),
            "locationAddress"
        );

        // 5. Resolve Slot Times
        LocalTime startTimeLocal;
        LocalTime endTimeLocal;

        if (request.slotStartTime() != null && !request.slotStartTime().isBlank() &&
            request.slotEndTime() != null && !request.slotEndTime().isBlank()) {
            startTimeLocal = parseLocalTime(request.slotStartTime());
            endTimeLocal = parseLocalTime(request.slotEndTime());
        } else {
            // Parse from slotId format like slot-09-10
            int[] hours = parseSlotIdHours(request.getEffectiveSlotId());
            startTimeLocal = LocalTime.of(hours[0], 0);
            endTimeLocal = LocalTime.of(hours[1], 0);
        }

        OffsetDateTime slotStart = bookingDate.atTime(startTimeLocal).atZone(ZONE_KOLKATA).toOffsetDateTime();
        OffsetDateTime slotEnd = bookingDate.atTime(endTimeLocal).atZone(ZONE_KOLKATA).toOffsetDateTime();

        // 6. Find Capable Technician
        Technician technician = technicianService.findTechnicianForCapabilities(businessId, List.of(service.getCode()))
            .orElseThrow(() -> new ValidationException("No capable technician available for this service"));

        // 7. Concurrency Hardening: PostgreSQL Transactional Advisory Lock (Belt and Braces)
        if (entityManager != null) {
            int k1 = (int) (technician.getId().getMostSignificantBits() & 0x7FFFFFFF);
            int k2 = (int) bookingDate.toEpochDay();
            entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(CAST(:k1 AS integer), CAST(:k2 AS integer))")
                .setParameter("k1", k1)
                .setParameter("k2", k2)
                .getResultList();
        }

        // 8. Check Slot Availability Before Reserving
        List<AlternativeSlotDto> alternatives = schedulingEngine.getAvailableAlternativeSlots(
            service.getId(),
            bookingDate,
            request.getEffectiveSlotId()
        );

        if (bookingDate.getDayOfWeek() == DayOfWeek.SUNDAY && !startTimeLocal.isBefore(LocalTime.of(14, 0))) {
            throw new SlotUnavailableException(
                "Sunday operating hours end at 02:00 pm. The selected slot is outside operating hours.",
                alternatives
            );
        }
        if (bookingDate.getDayOfWeek() != DayOfWeek.SUNDAY && !startTimeLocal.isBefore(LocalTime.of(14, 0)) && endTimeLocal.isBefore(LocalTime.of(16, 1))) {
            throw new SlotUnavailableException(
                "Afternoon break is from 02:00 pm to 04:00 pm. The selected slot is unavailable.",
                alternatives
            );
        }

        // Under advisory lock, check if requested slot is already booked
        OffsetDateTime startOfDay = bookingDate.atStartOfDay(ZONE_KOLKATA).toOffsetDateTime();
        OffsetDateTime endOfDay = bookingDate.plusDays(1).atStartOfDay(ZONE_KOLKATA).toOffsetDateTime();
        List<ScheduleEntry> activeEntries = scheduleEntryRepository.findByTechnicianAndDateRange(
            technician.getId(),
            com.repairreach.backend.scheduling.domain.ScheduleEntryStatus.ACTIVE,
            startOfDay,
            endOfDay
        );
        for (ScheduleEntry entry : activeEntries) {
            if (slotStart.isBefore(entry.getEndTime()) && slotEnd.isAfter(entry.getStartTime())) {
                throw new SlotUnavailableException(
                    "The selected time slot (" + startTimeLocal + " - " + endTimeLocal + ") has already been booked. Please choose from the available alternatives.",
                    alternatives
                );
            }
        }

        // 9. Generate Public Reference & Signed JWT Capability Tokens
        String datePrefix = bookingDate.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String publicReference = "RR-" + datePrefix + "-" + randomSuffix;

        UUID bookingId = UUID.randomUUID();

        Booking booking = new Booking();
        booking.setId(bookingId);
        booking.setBusinessId(businessId);
        booking.setPublicReference(publicReference);
        booking.setCustomerId(customer.getId());
        booking.setServiceOfferingId(service.getId());
        booking.setCustomerAddressId(address.getId());
        booking.setCustomerNameSnapshot(customer.getFullName());
        booking.setCustomerPhoneSnapshot(customer.getNormalizedPhone());
        booking.setServiceNameSnapshot(service.getName());
        booking.setAddressSnapshot(address.getAddressLine());
        booking.setProblemDescription(request.problemDescription() != null ? request.problemDescription() : "Appliance repair request");
        booking.setState(BookingState.CONFIRMED);
        booking.setRequestedSlotStart(slotStart);
        booking.setRequestedSlotEnd(slotEnd);

        Booking savedBooking;
        Job savedJob;
        try {
            savedBooking = bookingRepository.saveAndFlush(booking);

            // Create Job
            savedJob = jobService.createJobForBooking(savedBooking, customer, slotStart, slotEnd);

            // Assign Technician
            assignmentPolicyService.assignTechnician(savedJob.getId(), technician);

            // Reserve Slot (PostgreSQL GiST constraint is the final concurrency arbiter)
            schedulingEngine.reserveSlot(
                businessId,
                technician.getId(),
                savedJob.getId(),
                savedBooking.getId(),
                slotStart,
                slotEnd,
                idempotencyKey
            );
        } catch (DataIntegrityViolationException ex) {
            log.error("DataIntegrityViolationException during booking creation: {}", ex.getMessage(), ex);
            throw new SlotUnavailableException(
                "The selected time slot (" + startTimeLocal + " - " + endTimeLocal + ") has already been booked. Please choose from the available alternatives.",
                alternatives
            );
        }

        // 9. Emit Outbox Event
        outboxService.publishEvent(
            "BOOKING",
            savedBooking.getId(),
            "BOOKING_CONFIRMED",
            Map.of(
                "publicReference", savedBooking.getPublicReference(),
                "customerPhone", savedBooking.getCustomerPhoneSnapshot(),
                "serviceName", savedBooking.getServiceNameSnapshot(),
                "scheduledDate", bookingDate.toString(),
                "scheduledStartTime", startTimeLocal.toString(),
                "scheduledEndTime", endTimeLocal.toString()
            ),
            idempotencyKey
        );

        // 10. Construct Confirmation DTO
        String formattedSlotTime = startTimeLocal.format(TIME_FMT) + " - " + endTimeLocal.format(TIME_FMT);
        BookingConfirmationResponseDto responseDto = new BookingConfirmationResponseDto(
            savedBooking.getPublicReference(),
            savedBooking.getId(),
            savedBooking.getState().name(),
            savedBooking.getCustomerNameSnapshot(),
            savedBooking.getCustomerPhoneSnapshot(),
            service.getId(),
            savedBooking.getServiceNameSnapshot(),
            savedBooking.getAddressSnapshot(),
            savedBooking.getAddressSnapshot(),
            savedBooking.getProblemDescription(),
            bookingDate.toString(),
            startTimeLocal.toString() + ":00",
            endTimeLocal.toString() + ":00",
            new BookingConfirmationResponseDto.ScheduledSlotInfoDto(
                bookingDate.toString(),
                startTimeLocal.toString().substring(0, 5),
                endTimeLocal.toString().substring(0, 5),
                formattedSlotTime
            ),
            new BookingConfirmationResponseDto.CustomerInfoDto(
                savedBooking.getCustomerNameSnapshot(),
                savedBooking.getCustomerPhoneSnapshot()
            ),
            new BookingConfirmationResponseDto.ServiceInfoDto(
                service.getId(),
                savedBooking.getServiceNameSnapshot()
            ),
            null, // capabilityToken
            savedJob.getFeedbackCapabilityToken(),
            savedJob.getState().name(),
            new BigDecimal("299.00"),
            savedBooking.getCreatedAt() != null ? savedBooking.getCreatedAt() : OffsetDateTime.now()
        );

        // 11. Save Idempotency Record
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                IdempotencyRecord record = new IdempotencyRecord();
                record.setScope("BOOKING_CREATE");
                record.setIdempotencyKey(idempotencyKey.trim());
                record.setRequestHash(requestHash);
                record.setResponseStatus(201);
                record.setResponseBody(objectMapper.writeValueAsString(responseDto));
                record.setExpiresAt(OffsetDateTime.now().plusDays(7));
                idempotencyRecordRepository.saveAndFlush(record);
            } catch (Exception e) {
                log.warn("Failed to store idempotency record: {}", e.getMessage());
            }
        }

        return responseDto;
    }

    @Transactional(readOnly = true)
    public BookingTrackingResponseDto getBookingTracking(String publicReference) {
        Booking booking = bookingRepository.findByPublicReference(publicReference)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found for reference: " + publicReference));

        Job job = jobService.findByBookingId(booking.getId()).orElse(null);
        Assignment assignment = (job != null) ? assignmentPolicyService.getCurrentAssignment(job.getId()).orElse(null) : null;
        Technician technician = (assignment != null) ? technicianService.getActiveTechnicians(booking.getBusinessId())
            .stream().filter(t -> t.getId().equals(assignment.getTechnicianId())).findFirst().orElse(null) : null;

        LocalDate bookingDate = booking.getRequestedSlotStart().atZoneSameInstant(ZONE_KOLKATA).toLocalDate();
        LocalTime startTime = booking.getRequestedSlotStart().atZoneSameInstant(ZONE_KOLKATA).toLocalTime();
        LocalTime endTime = booking.getRequestedSlotEnd().atZoneSameInstant(ZONE_KOLKATA).toLocalTime();
        String timeRangeFormatted = startTime.format(TIME_FMT) + " - " + endTime.format(TIME_FMT);

        boolean isConfirmed = (booking.getState() == BookingState.CONFIRMED);
        boolean hasArrived = (job != null && job.getActualArrivedAt() != null);
        boolean hasCompleted = (job != null && job.getActualCompletedAt() != null);
        boolean canCancel = isConfirmed && !hasArrived && !hasCompleted;

        BookingTrackingResponseDto.TechnicianSummaryDto techSummary = new BookingTrackingResponseDto.TechnicianSummaryDto(
            technician != null,
            technician != null ? technician.getFullName() : null,
            technician != null ? technician.getPhone() : null
        );

        BookingTrackingResponseDto.TimelineSummaryDto timeline = new BookingTrackingResponseDto.TimelineSummaryDto(
            booking.getCreatedAt(),
            job != null ? job.getCreatedAt() : null,
            job != null ? job.getActualEnRouteAt() : null,
            job != null ? job.getActualArrivedAt() : null,
            job != null ? job.getActualCompletedAt() : null
        );

        return new BookingTrackingResponseDto(
            booking.getPublicReference(),
            booking.getId(),
            booking.getState().name(),
            booking.getState().name(),
            job != null ? job.getState().name() : "SCHEDULED",
            booking.getCustomerNameSnapshot(),
            booking.getCustomerPhoneSnapshot(),
            booking.getServiceNameSnapshot(),
            booking.getAddressSnapshot(),
            booking.getAddressSnapshot(),
            booking.getProblemDescription(),
            bookingDate.toString(),
            startTime.toString() + ":00",
            endTime.toString() + ":00",
            timeRangeFormatted,
            techSummary,
            technician != null ? technician.getFullName() : null,
            technician != null ? technician.getPhone() : null,
            timeline,
            canCancel,
            canCancel,
            new BigDecimal("299.00"),
            job != null ? job.getFeedbackCapabilityToken() : null,
            booking.getCreatedAt(),
            booking.getUpdatedAt()
        );
    }

    @Transactional
    public CancelBookingResponseDto cancelBooking(
        String publicReference,
        CancelBookingRequestDto request,
        String idempotencyKey
    ) {
        Booking booking = bookingRepository.findByPublicReference(publicReference)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found for reference: " + publicReference));

        if (booking.getState() == BookingState.CANCELLED || booking.getState() == BookingState.CLOSED) {
            throw new InvalidStateTransitionException("Booking has already been cancelled or closed.");
        }

        Job job = jobService.findByBookingId(booking.getId()).orElse(null);

        // Check if technician already en route or arrived
        boolean isPostDeparture = (job != null && (job.getActualEnRouteAt() != null || job.getActualArrivedAt() != null));
        if (isPostDeparture) {
            booking.setCancellationChargeApplicable(true);
            booking.setCancellationChargeType(CancellationChargeType.POST_ARRIVAL_VISIT_CHARGE_APPLICABLE);
            booking.setCancellationReason(request != null ? request.cancellationReason() : "Cancelled after technician departure");
            booking.setCancelledAt(OffsetDateTime.now());
            booking.setState(BookingState.CANCELLED);
            bookingRepository.saveAndFlush(booking);

            throw new PostArrivalChargeException(
                "Technician is already en route or arrived at the service location. Standard visiting charge of ₹299 is applicable."
            );
        }

        // Pre-arrival free cancellation
        booking.setState(BookingState.CANCELLED);
        booking.setCancelledAt(OffsetDateTime.now());
        booking.setCancellationReason(request != null ? request.cancellationReason() : "Customer cancelled before arrival");
        booking.setCancellationChargeApplicable(false);
        booking.setCancellationChargeType(CancellationChargeType.PRE_ARRIVAL_NO_VISIT_CHARGE);
        bookingRepository.saveAndFlush(booking);

        if (job != null) {
            job.setState(JobState.UNABLE_TO_SERVE);
            job.setInabilityReason("Customer cancelled booking before technician arrival");
            job.setUnableToServeAt(OffsetDateTime.now());
            jobService.saveJob(job);
            jobService.recordJobEvent(job.getId(), JobState.SCHEDULED, JobState.UNABLE_TO_SERVE, "Customer cancelled booking");
        }

        // Release schedule entry so slot becomes available again
        schedulingEngine.releaseSlot(booking.getId(), "Customer pre-arrival cancellation");

        // Emit outbox event
        outboxService.publishEvent(
            "BOOKING",
            booking.getId(),
            "BOOKING_CANCELLED",
            Map.of(
                "publicReference", booking.getPublicReference(),
                "visitingChargeApplicable", false,
                "reason", booking.getCancellationReason()
            ),
            idempotencyKey
        );

        return new CancelBookingResponseDto(
            booking.getPublicReference(),
            "CANCELLED",
            "PRE_ARRIVAL_NO_VISIT_CHARGE",
            "PRE_ARRIVAL_NO_VISIT_CHARGE",
            false,
            BigDecimal.ZERO,
            booking.getCancelledAt(),
            "Booking successfully cancelled before technician arrival. No visiting charge applies."
        );
    }

    private LocalTime parseLocalTime(String timeStr) {
        String clean = timeStr.trim();
        if (clean.length() == 5) {
            return LocalTime.parse(clean, DateTimeFormatter.ofPattern("HH:mm"));
        } else if (clean.length() >= 8) {
            return LocalTime.parse(clean.substring(0, 8), DateTimeFormatter.ofPattern("HH:mm:ss"));
        }
        return LocalTime.parse(clean);
    }

    private int[] parseSlotIdHours(String slotId) {
        // Expected format: slot-09-10 or slot-11-12
        if (slotId != null && slotId.startsWith("slot-")) {
            String[] parts = slotId.replace("slot-", "").split("-");
            if (parts.length == 2) {
                try {
                    return new int[]{Integer.parseInt(parts[0]), Integer.parseInt(parts[1])};
                } catch (NumberFormatException ignored) {}
            }
        }
        return new int[]{9, 10}; // fallback
    }

    private String hashPayload(CreateBookingRequestDto request) {
        String key = String.format("%s|%s|%s|%s|%s|%s",
            request.getEffectiveName().trim(),
            request.getEffectivePhone().trim(),
            request.serviceId() != null ? request.serviceId().toString() : "",
            request.locationAddress() != null ? request.locationAddress().trim() : "",
            request.requestedDate() != null ? request.requestedDate().trim() : "",
            request.getEffectiveSlotId().trim()
        );
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(key.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encoded) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }
}
