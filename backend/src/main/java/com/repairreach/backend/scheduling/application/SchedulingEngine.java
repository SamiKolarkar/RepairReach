package com.repairreach.backend.scheduling.application;

import com.repairreach.backend.business.application.BusinessService;
import com.repairreach.backend.business.domain.Business;
import com.repairreach.backend.business.domain.BusinessSettings;
import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.scheduling.domain.*;
import com.repairreach.backend.scheduling.infrastructure.AvailabilityExceptionRepository;
import com.repairreach.backend.scheduling.infrastructure.AvailabilityRuleRepository;
import com.repairreach.backend.scheduling.infrastructure.ScheduleEntryRepository;
import com.repairreach.backend.scheduling.infrastructure.ScheduleRevisionRepository;
import com.repairreach.backend.scheduling.web.dto.AvailabilitySlotsResponseDto;
import com.repairreach.backend.scheduling.web.dto.TimeSlotDto;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import com.repairreach.backend.technician.application.TechnicianService;
import com.repairreach.backend.technician.domain.Technician;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SchedulingEngine {

    private static final ZoneId ZONE_KOLKATA = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME_LABEL_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    private final BusinessService businessService;
    private final CatalogService catalogService;
    private final TechnicianService technicianService;
    private final AvailabilityRuleRepository availabilityRuleRepository;
    private final AvailabilityExceptionRepository availabilityExceptionRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ScheduleRevisionRepository scheduleRevisionRepository;

    public SchedulingEngine(
        BusinessService businessService,
        CatalogService catalogService,
        TechnicianService technicianService,
        AvailabilityRuleRepository availabilityRuleRepository,
        AvailabilityExceptionRepository availabilityExceptionRepository,
        ScheduleEntryRepository scheduleEntryRepository,
        ScheduleRevisionRepository scheduleRevisionRepository
    ) {
        this.businessService = businessService;
        this.catalogService = catalogService;
        this.technicianService = technicianService;
        this.availabilityRuleRepository = availabilityRuleRepository;
        this.availabilityExceptionRepository = availabilityExceptionRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.scheduleRevisionRepository = scheduleRevisionRepository;
    }

    @Transactional(readOnly = true)
    public AvailabilitySlotsResponseDto calculateSlots(UUID serviceId, LocalDate date) {
        UUID businessId = TenantContext.getBusinessId();
        Business business = businessService.getBusiness(businessId);
        BusinessSettings settings = businessService.getBusinessSettings(businessId);
        ServiceOffering service = catalogService.getServiceById(serviceId);

        // Disallow mobile services
        if (service.getCode().toUpperCase().contains("MOBILE") || service.getName().toUpperCase().contains("MOBILE")) {
            throw new ValidationException(
                "Mobile phone repair is not supported",
                List.of(new InvalidParamDto("serviceId", "Mobile phone repair is strictly excluded", serviceId))
            );
        }

        // Find candidate technician
        Optional<Technician> techOpt = technicianService.findTechnicianForCapabilities(businessId, List.of(service.getCode()));
        Technician technician = techOpt.orElse(null);

        // Determine base schedule boundaries for date
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        boolean isSunday = (dayOfWeek == DayOfWeek.SUNDAY);

        LocalTime openTime = settings.getWeekdayOpenTime();
        LocalTime closeTime = settings.getWeekdayCloseTime();
        LocalTime sundayClose = settings.getSundayCloseTime();
        LocalTime breakStart = settings.getAfternoonBreakStart();
        LocalTime breakEnd = settings.getAfternoonBreakEnd();

        // Query active schedule entries for the technician / business on this date
        OffsetDateTime startOfDay = date.atStartOfDay(ZONE_KOLKATA).toOffsetDateTime();
        OffsetDateTime endOfDay = date.plusDays(1).atStartOfDay(ZONE_KOLKATA).toOffsetDateTime();

        List<ScheduleEntry> activeEntries = (technician != null)
            ? scheduleEntryRepository.findByTechnicianAndDateRange(technician.getId(), ScheduleEntryStatus.ACTIVE, startOfDay, endOfDay)
            : scheduleEntryRepository.findByBusinessAndDateRange(businessId, ScheduleEntryStatus.ACTIVE, startOfDay, endOfDay);

        List<AvailabilityException> exceptions = (technician != null)
            ? availabilityExceptionRepository.findByTechnicianIdAndExceptionDate(technician.getId(), date)
            : availabilityExceptionRepository.findByBusinessIdAndExceptionDate(businessId, date);

        List<TimeSlotDto> slots = new ArrayList<>();

        // Generate 1-hour slots from openTime (09:00) to weekday closeTime (19:00)
        LocalTime currentSlotStart = openTime;
        while (currentSlotStart.isBefore(closeTime)) {
            LocalTime currentSlotEnd = currentSlotStart.plusHours(1);
            if (currentSlotEnd.isAfter(closeTime)) {
                break;
            }

            String startStr = currentSlotStart.toString().substring(0, 5);
            String endStr = currentSlotEnd.toString().substring(0, 5);
            String startHH = currentSlotStart.format(DateTimeFormatter.ofPattern("HH"));
            String endHH = currentSlotEnd.format(DateTimeFormatter.ofPattern("HH"));
            String slotId = "slot-" + startHH + "-" + endHH;
            String label = currentSlotStart.format(TIME_LABEL_FMT) + " - " + currentSlotEnd.format(TIME_LABEL_FMT);

            OffsetDateTime slotStartTz = date.atTime(currentSlotStart).atZone(ZONE_KOLKATA).toOffsetDateTime();
            OffsetDateTime slotEndTz = date.atTime(currentSlotEnd).atZone(ZONE_KOLKATA).toOffsetDateTime();

            boolean available = true;
            String reason = SlotReason.AVAILABLE.name();

            // Check Sunday Closing (>= 14:00 on Sunday)
            if (isSunday && (currentSlotStart.isAfter(sundayClose) || currentSlotStart.equals(sundayClose))) {
                available = false;
                reason = SlotReason.SUNDAY_CLOSING.name();
            }
            // Check Afternoon Break on weekdays (14:00 - 16:00)
            else if (!isSunday && !currentSlotStart.isBefore(breakStart) && currentSlotEnd.isBefore(breakEnd.plusSeconds(1))) {
                available = false;
                reason = SlotReason.AFTERNOON_BREAK.name();
            }
            // Check Exceptions (Holidays / Leave)
            else if (isBlockedByException(exceptions, currentSlotStart, currentSlotEnd)) {
                available = false;
                reason = SlotReason.HOLIDAY.name();
            }
            // Check Existing Booked Schedule Entries
            else if (isOverlappingActiveBooking(activeEntries, slotStartTz, slotEndTz)) {
                available = false;
                reason = SlotReason.BOOKED.name();
            }

            if (available) {
                slots.add(new TimeSlotDto(slotId, startStr, endStr, label, true, SlotReason.AVAILABLE.name()));
            }
            currentSlotStart = currentSlotEnd;
        }

        return new AvailabilitySlotsResponseDto(date.toString(), serviceId, slots);
    }

    public List<AlternativeSlotDto> getAvailableAlternativeSlots(UUID serviceId, LocalDate date, String excludedSlotId) {
        AvailabilitySlotsResponseDto availability = calculateSlots(serviceId, date);
        return availability.slots().stream()
            .filter(TimeSlotDto::available)
            .filter(slot -> excludedSlotId == null || !slot.slotId().equalsIgnoreCase(excludedSlotId))
            .map(slot -> new AlternativeSlotDto(slot.slotId(), slot.startTime(), slot.endTime(), slot.label()))
            .toList();
    }

    @Transactional
    public ScheduleEntry reserveSlot(
        UUID businessId,
        UUID technicianId,
        UUID jobId,
        UUID bookingId,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        String idempotencyKey
    ) {
        ScheduleEntry entry = new ScheduleEntry();
        entry.setBusinessId(businessId);
        entry.setTechnicianId(technicianId);
        entry.setJobId(jobId);
        entry.setBookingId(bookingId);
        entry.setActivityType(ScheduleActivityType.HOME_VISIT);
        entry.setStartTime(startTime);
        entry.setEndTime(endTime);
        entry.setStatus(ScheduleEntryStatus.ACTIVE);

        ScheduleEntry saved = scheduleEntryRepository.saveAndFlush(entry);

        ScheduleRevision revision = new ScheduleRevision();
        revision.setScheduleEntryId(saved.getId());
        revision.setCommandName("BOOKING_CREATED");
        revision.setOldStartTime(startTime);
        revision.setOldEndTime(endTime);
        revision.setNewStartTime(startTime);
        revision.setNewEndTime(endTime);
        revision.setActorType("SYSTEM");
        revision.setChangeReason("Initial booking confirmed");
        revision.setIdempotencyKey(idempotencyKey);
        revision.setAffectedEntriesSummary("[\"" + saved.getId() + "\"]");

        scheduleRevisionRepository.save(revision);

        return saved;
    }

    @Transactional
    public void releaseSlot(UUID bookingId, String reason) {
        scheduleEntryRepository.findByBookingId(bookingId).ifPresent(entry -> {
            entry.setStatus(ScheduleEntryStatus.RELEASED);
            ScheduleEntry saved = scheduleEntryRepository.saveAndFlush(entry);

            ScheduleRevision revision = new ScheduleRevision();
            revision.setScheduleEntryId(saved.getId());
            revision.setCommandName("BOOKING_CANCELLED");
            revision.setOldStartTime(saved.getStartTime());
            revision.setOldEndTime(saved.getEndTime());
            revision.setNewStartTime(saved.getStartTime());
            revision.setNewEndTime(saved.getEndTime());
            revision.setActorType("SYSTEM");
            revision.setChangeReason(reason != null ? reason : "Booking cancelled by customer");
            scheduleRevisionRepository.save(revision);
        });
    }

    private boolean isBlockedByException(List<AvailabilityException> exceptions, LocalTime start, LocalTime end) {
        if (exceptions == null || exceptions.isEmpty()) return false;
        for (AvailabilityException ex : exceptions) {
            if (!ex.getAvailable()) {
                if (ex.getStartTime() == null && ex.getEndTime() == null) {
                    return true; // Full day off
                }
                if (ex.getStartTime() != null && ex.getEndTime() != null) {
                    if (start.isBefore(ex.getEndTime()) && end.isAfter(ex.getStartTime())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean isOverlappingActiveBooking(List<ScheduleEntry> entries, OffsetDateTime start, OffsetDateTime end) {
        if (entries == null || entries.isEmpty()) return false;
        for (ScheduleEntry entry : entries) {
            if (entry.getStatus() == ScheduleEntryStatus.ACTIVE) {
                // Overlap test: start < entry.end && end > entry.start
                if (start.isBefore(entry.getEndTime()) && end.isAfter(entry.getStartTime())) {
                    return true;
                }
            }
        }
        return false;
    }
}
