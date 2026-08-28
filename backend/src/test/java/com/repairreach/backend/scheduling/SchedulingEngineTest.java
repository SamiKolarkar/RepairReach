package com.repairreach.backend.scheduling;

import com.repairreach.backend.business.application.BusinessService;
import com.repairreach.backend.business.domain.Business;
import com.repairreach.backend.business.domain.BusinessSettings;
import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.scheduling.application.SchedulingEngine;
import com.repairreach.backend.scheduling.domain.ScheduleEntry;
import com.repairreach.backend.scheduling.domain.ScheduleEntryStatus;
import com.repairreach.backend.scheduling.infrastructure.AvailabilityExceptionRepository;
import com.repairreach.backend.scheduling.infrastructure.AvailabilityRuleRepository;
import com.repairreach.backend.scheduling.infrastructure.ScheduleEntryRepository;
import com.repairreach.backend.scheduling.infrastructure.ScheduleRevisionRepository;
import com.repairreach.backend.scheduling.web.dto.AvailabilitySlotsResponseDto;
import com.repairreach.backend.scheduling.web.dto.TimeSlotDto;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import com.repairreach.backend.technician.application.TechnicianService;
import com.repairreach.backend.technician.domain.Technician;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchedulingEngineTest {

    @Mock
    private BusinessService businessService;

    @Mock
    private CatalogService catalogService;

    @Mock
    private TechnicianService technicianService;

    @Mock
    private AvailabilityRuleRepository availabilityRuleRepository;

    @Mock
    private AvailabilityExceptionRepository availabilityExceptionRepository;

    @Mock
    private ScheduleEntryRepository scheduleEntryRepository;

    @Mock
    private ScheduleRevisionRepository scheduleRevisionRepository;

    @InjectMocks
    private SchedulingEngine schedulingEngine;

    private UUID businessId;
    private UUID serviceId;
    private UUID technicianId;
    private Business business;
    private BusinessSettings settings;
    private ServiceOffering service;
    private Technician technician;

    @BeforeEach
    void setUp() {
        businessId = TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID;
        serviceId = UUID.randomUUID();
        technicianId = UUID.randomUUID();

        business = new Business();
        business.setId(businessId);
        business.setCode("SOLAPUR_MAIN");
        business.setName("RepairReach Solapur");

        settings = new BusinessSettings();
        settings.setBusinessId(businessId);
        settings.setWeekdayOpenTime(LocalTime.of(9, 0));
        settings.setWeekdayCloseTime(LocalTime.of(19, 0));
        settings.setSundayOpenTime(LocalTime.of(9, 0));
        settings.setSundayCloseTime(LocalTime.of(14, 0));
        settings.setAfternoonBreakStart(LocalTime.of(14, 0));
        settings.setAfternoonBreakEnd(LocalTime.of(16, 0));

        service = new ServiceOffering();
        service.setId(serviceId);
        service.setCode("WASHING_MACHINE_REPAIR");
        service.setName("Washing Machine Repair");
        service.setBaseDurationMinutes(60);

        technician = new Technician();
        technician.setId(technicianId);
        technician.setFullName("Ramesh Rathod");
    }

    @Test
    @DisplayName("Should return available slots on weekday excluding afternoon break (14:00-16:00)")
    void shouldReturnAvailableSlotsOnWeekdayExcludingBreak() {
        // Monday date
        LocalDate weekday = LocalDate.of(2026, 8, 17);

        when(businessService.getBusiness(businessId)).thenReturn(business);
        when(businessService.getBusinessSettings(businessId)).thenReturn(settings);
        when(catalogService.getServiceById(serviceId)).thenReturn(service);
        when(technicianService.findTechnicianForCapabilities(eq(businessId), any())).thenReturn(Optional.of(technician));
        when(scheduleEntryRepository.findByTechnicianAndDateRange(eq(technicianId), eq(ScheduleEntryStatus.ACTIVE), any(), any()))
            .thenReturn(Collections.emptyList());
        when(availabilityExceptionRepository.findByTechnicianIdAndExceptionDate(eq(technicianId), eq(weekday)))
            .thenReturn(Collections.emptyList());

        AvailabilitySlotsResponseDto response = schedulingEngine.calculateSlots(serviceId, weekday);

        assertThat(response).isNotNull();
        assertThat(response.date()).isEqualTo("2026-08-17");
        assertThat(response.serviceId()).isEqualTo(serviceId);

        // On weekday with 09:00-19:00 (10 1-hr slots) minus break 14:00-16:00 (2 slots), exactly 8 available slots are returned
        assertThat(response.slots()).hasSize(8);
        assertThat(response.slots()).allMatch(TimeSlotDto::available);

        List<String> slotIds = response.slots().stream().map(TimeSlotDto::slotId).toList();
        assertThat(slotIds).contains("slot-09-10", "slot-10-11", "slot-11-12", "slot-12-13", "slot-13-14", "slot-16-17", "slot-17-18", "slot-18-19");
        assertThat(slotIds).doesNotContain("slot-14-15", "slot-15-16");
    }

    @Test
    @DisplayName("Should return only morning slots on Sunday (09:00-14:00)")
    void shouldReturnMorningSlotsOnSunday() {
        // Sunday date
        LocalDate sunday = LocalDate.of(2026, 8, 23);

        when(businessService.getBusiness(businessId)).thenReturn(business);
        when(businessService.getBusinessSettings(businessId)).thenReturn(settings);
        when(catalogService.getServiceById(serviceId)).thenReturn(service);
        when(technicianService.findTechnicianForCapabilities(eq(businessId), any())).thenReturn(Optional.of(technician));
        when(scheduleEntryRepository.findByTechnicianAndDateRange(eq(technicianId), eq(ScheduleEntryStatus.ACTIVE), any(), any()))
            .thenReturn(Collections.emptyList());
        when(availabilityExceptionRepository.findByTechnicianIdAndExceptionDate(eq(technicianId), eq(sunday)))
            .thenReturn(Collections.emptyList());

        AvailabilitySlotsResponseDto response = schedulingEngine.calculateSlots(serviceId, sunday);

        assertThat(response).isNotNull();
        // Sunday: 09:00 to 14:00 = 5 slots (09-10, 10-11, 11-12, 12-13, 13-14)
        assertThat(response.slots()).hasSize(5);
        assertThat(response.slots()).allMatch(TimeSlotDto::available);

        List<String> slotIds = response.slots().stream().map(TimeSlotDto::slotId).toList();
        assertThat(slotIds).containsExactly("slot-09-10", "slot-10-11", "slot-11-12", "slot-12-13", "slot-13-14");
    }

    @Test
    @DisplayName("Should exclude booked slots and provide alternatives")
    void shouldExcludeBookedSlotsAndProvideAlternatives() {
        LocalDate weekday = LocalDate.of(2026, 8, 18);
        ZoneId zone = ZoneId.of("Asia/Kolkata");

        ScheduleEntry bookedEntry = new ScheduleEntry();
        bookedEntry.setTechnicianId(technicianId);
        bookedEntry.setStatus(ScheduleEntryStatus.ACTIVE);
        bookedEntry.setStartTime(weekday.atTime(11, 0).atZone(zone).toOffsetDateTime());
        bookedEntry.setEndTime(weekday.atTime(12, 0).atZone(zone).toOffsetDateTime());

        when(businessService.getBusiness(businessId)).thenReturn(business);
        when(businessService.getBusinessSettings(businessId)).thenReturn(settings);
        when(catalogService.getServiceById(serviceId)).thenReturn(service);
        when(technicianService.findTechnicianForCapabilities(eq(businessId), any())).thenReturn(Optional.of(technician));
        when(scheduleEntryRepository.findByTechnicianAndDateRange(eq(technicianId), eq(ScheduleEntryStatus.ACTIVE), any(), any()))
            .thenReturn(List.of(bookedEntry));
        when(availabilityExceptionRepository.findByTechnicianIdAndExceptionDate(eq(technicianId), eq(weekday)))
            .thenReturn(Collections.emptyList());

        AvailabilitySlotsResponseDto response = schedulingEngine.calculateSlots(serviceId, weekday);

        // slot-11-12 is booked so it is filtered out (7 available slots left)
        assertThat(response.slots()).hasSize(7);
        assertThat(response.slots().stream().map(TimeSlotDto::slotId)).doesNotContain("slot-11-12");

        List<AlternativeSlotDto> alternatives = schedulingEngine.getAvailableAlternativeSlots(serviceId, weekday, "slot-11-12");
        assertThat(alternatives).hasSize(7);
        assertThat(alternatives.stream().map(AlternativeSlotDto::slotId)).doesNotContain("slot-11-12");
    }

    @Test
    @DisplayName("Should reject mobile phone service request with ValidationException")
    void shouldRejectMobilePhoneService() {
        ServiceOffering mobileService = new ServiceOffering();
        mobileService.setId(UUID.randomUUID());
        mobileService.setCode("MOBILE_PHONE_REPAIR");
        mobileService.setName("Smartphone Repair");

        when(businessService.getBusiness(businessId)).thenReturn(business);
        when(businessService.getBusinessSettings(businessId)).thenReturn(settings);
        when(catalogService.getServiceById(mobileService.getId())).thenReturn(mobileService);

        assertThatThrownBy(() -> schedulingEngine.calculateSlots(mobileService.getId(), LocalDate.of(2026, 8, 19)))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Mobile phone repair");
    }
}
