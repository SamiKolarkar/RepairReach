package com.repairreach.backend.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairreach.backend.assignment.application.AssignmentPolicyService;
import com.repairreach.backend.assignment.domain.Assignment;
import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.booking.domain.BookingState;
import com.repairreach.backend.booking.domain.CancellationChargeType;
import com.repairreach.backend.booking.infrastructure.BookingRepository;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.CancelBookingRequestDto;
import com.repairreach.backend.booking.web.dto.CancelBookingResponseDto;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.customer.application.CustomerService;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.domain.CustomerAddress;
import com.repairreach.backend.job.application.JobService;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.notify.application.OutboxService;
import com.repairreach.backend.scheduling.application.SchedulingEngine;
import com.repairreach.backend.scheduling.domain.ScheduleEntry;
import com.repairreach.backend.scheduling.infrastructure.ScheduleEntryRepository;
import com.repairreach.backend.shared.exception.PostArrivalChargeException;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.infrastructure.IdempotencyRecordRepository;
import com.repairreach.backend.shared.security.JwtCapabilityTokenService;
import com.repairreach.backend.technician.application.TechnicianService;
import com.repairreach.backend.technician.domain.Technician;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CustomerService customerService;

    @Mock
    private CatalogService catalogService;

    @Mock
    private TechnicianService technicianService;

    @Mock
    private AssignmentPolicyService assignmentPolicyService;

    @Mock
    private SchedulingEngine schedulingEngine;

    @Mock
    private JobService jobService;

    @Mock
    private OutboxService outboxService;

    @Mock
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Mock
    private ScheduleEntryRepository scheduleEntryRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Spy
    private JwtCapabilityTokenService jwtCapabilityTokenService = new JwtCapabilityTokenService("test-secret-repairreach-solapur-2026-key", new ObjectMapper());

    @InjectMocks
    private BookingService bookingService;

    private UUID serviceId;
    private UUID customerId;
    private UUID technicianId;
    private ServiceOffering service;
    private Customer customer;
    private CustomerAddress address;
    private Technician technician;

    @BeforeEach
    void setUp() {
        serviceId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        technicianId = UUID.randomUUID();

        service = new ServiceOffering();
        service.setId(serviceId);
        service.setCode("REFRIGERATOR_REPAIR");
        service.setName("Refrigerator Repair & Service");

        customer = new Customer();
        customer.setId(customerId);
        customer.setFullName("Sunil Kadam");
        customer.setNormalizedPhone("+919876543210");

        address = new CustomerAddress();
        address.setId(UUID.randomUUID());
        address.setCustomerId(customerId);
        address.setAddressLine("12 Budhwar Peth, Solapur");

        technician = new Technician();
        technician.setId(technicianId);
        technician.setFullName("Ramesh Pawar");
    }

    @Test
    @DisplayName("Should successfully create booking and return confirmed details")
    void shouldCreateBookingSuccessfully() {
        CreateBookingRequestDto request = new CreateBookingRequestDto(
            "Sunil Kadam",
            "+91 9876543210",
            serviceId,
            "12 Budhwar Peth, Solapur",
            "Cooling issue in frost-free fridge",
            "2026-08-20",
            "slot-11-12",
            "11:00",
            "12:00"
        );

        when(catalogService.getServiceById(serviceId)).thenReturn(service);
        when(customerService.findOrCreateCustomer(any(), any(), eq("Sunil Kadam"), eq("+91 9876543210"), any(), any())).thenReturn(customer);
        when(customerService.findOrCreateAddress(eq(customer), eq("12 Budhwar Peth, Solapur"), any())).thenReturn(address);
        when(technicianService.findTechnicianForCapabilities(any(), any())).thenReturn(Optional.of(technician));
        when(schedulingEngine.getAvailableAlternativeSlots(eq(serviceId), any(), eq("slot-11-12"))).thenReturn(Collections.emptyList());
        when(scheduleEntryRepository.findByTechnicianAndDateRange(eq(technicianId), any(), any(), any())).thenReturn(Collections.emptyList());

        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setCreatedAt(OffsetDateTime.now());
            return b;
        });

        Job job = new Job();
        job.setId(UUID.randomUUID());
        job.setState(com.repairreach.backend.job.domain.JobState.SCHEDULED);
        job.setFeedbackCapabilityToken("fb-tok-12345678");
        when(jobService.createJobForBooking(any(), eq(customer), any(), any())).thenReturn(job);

        BookingConfirmationResponseDto response = bookingService.createBooking(request, "idemp-key-001", null);

        assertThat(response).isNotNull();
        assertThat(response.publicReference()).startsWith("RR-");
        assertThat(response.status()).isEqualTo("CONFIRMED");
        assertThat(response.customerName()).isEqualTo("Sunil Kadam");
        assertThat(response.customerPhone()).isEqualTo("+919876543210");
        assertThat(response.scheduledDate()).isEqualTo("2026-08-20");
        assertThat(response.feedbackCapabilityToken()).isNotNull();

        verify(outboxService, times(1)).publishEvent(eq("BOOKING"), any(), eq("BOOKING_CONFIRMED"), any(), eq("idemp-key-001"));
    }

    @Test
    @DisplayName("Should successfully create booking and link Firebase authenticated user (String authUserId)")
    void shouldCreateBookingWithFirebaseAuthenticatedUser() {
        String firebaseUid = "pL4x9ZbqW8Y1Nm2K3";
        CreateBookingRequestDto request = new CreateBookingRequestDto(
            "Sunil Kadam",
            "+91 9876543210",
            serviceId,
            "12 Budhwar Peth, Solapur",
            "Cooling issue in fridge",
            "2026-08-20",
            "slot-11-12",
            "11:00",
            "12:00"
        );

        when(catalogService.getServiceById(serviceId)).thenReturn(service);
        when(customerService.findOrCreateCustomer(any(), eq(firebaseUid), eq("Sunil Kadam"), eq("+91 9876543210"), any(), any())).thenReturn(customer);
        when(customerService.findOrCreateAddress(eq(customer), eq("12 Budhwar Peth, Solapur"), any())).thenReturn(address);
        when(technicianService.findTechnicianForCapabilities(any(), any())).thenReturn(Optional.of(technician));
        when(schedulingEngine.getAvailableAlternativeSlots(eq(serviceId), any(), eq("slot-11-12"))).thenReturn(Collections.emptyList());
        when(scheduleEntryRepository.findByTechnicianAndDateRange(eq(technicianId), any(), any(), any())).thenReturn(Collections.emptyList());

        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setCreatedAt(OffsetDateTime.now());
            return b;
        });

        Job job = new Job();
        job.setId(UUID.randomUUID());
        job.setState(com.repairreach.backend.job.domain.JobState.SCHEDULED);
        job.setFeedbackCapabilityToken("fb-tok-12345678");
        when(jobService.createJobForBooking(any(), eq(customer), any(), any())).thenReturn(job);

        BookingConfirmationResponseDto response = bookingService.createBooking(request, "idemp-key-fb-001", firebaseUid);

        assertThat(response).isNotNull();
        assertThat(response.publicReference()).startsWith("RR-");
        assertThat(response.status()).isEqualTo("CONFIRMED");
        verify(customerService, times(1)).findOrCreateCustomer(any(), eq(firebaseUid), eq("Sunil Kadam"), eq("+91 9876543210"), any(), any());
    }

    @Test
    @DisplayName("Should throw ValidationException when slotId is missing")
    void shouldThrowWhenSlotIdMissing() {
        CreateBookingRequestDto request = new CreateBookingRequestDto(
            "Sunil Kadam",
            "+91 9876543210",
            serviceId,
            "12 Budhwar Peth, Solapur",
            "Cooling issue",
            "2026-08-20",
            null, // missing slotId!
            null,
            null
        );

        assertThatThrownBy(() -> bookingService.createBooking(request, null, null))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Booking request validation failed");
    }

    @Test
    @DisplayName("Pre-arrival cancellation: waives visiting charge (visitingChargeApplicable = false)")
    void shouldCancelBookingPreArrivalWithoutFee() {
        Booking booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setPublicReference("RR-260820-ABC123");
        booking.setState(BookingState.CONFIRMED);

        Job job = new Job();
        job.setId(UUID.randomUUID());
        job.setBookingId(booking.getId());
        job.setActualArrivedAt(null); // technician has NOT arrived

        when(bookingRepository.findByPublicReference("RR-260820-ABC123")).thenReturn(Optional.of(booking));
        when(jobService.findByBookingId(booking.getId())).thenReturn(Optional.of(job));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenReturn(booking);

        CancelBookingResponseDto response = bookingService.cancelBooking(
            "RR-260820-ABC123",
            new CancelBookingRequestDto("Appliance working again", null),
            null
        );

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("CANCELLED");
        assertThat(response.visitingChargeApplicable()).isFalse();
        assertThat(response.cancellationOutcome()).isEqualTo("PRE_ARRIVAL_NO_VISIT_CHARGE");
        assertThat(booking.getCancellationChargeType()).isEqualTo(CancellationChargeType.PRE_ARRIVAL_NO_VISIT_CHARGE);

        verify(schedulingEngine, times(1)).releaseSlot(eq(booking.getId()), any());
    }

    @Test
    @DisplayName("Post-arrival cancellation: technician arrived triggers 409 PostArrivalChargeException")
    void shouldRejectCancellationPostArrivalWithFee() {
        Booking booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setPublicReference("RR-260820-ARRIVED");
        booking.setState(BookingState.CONFIRMED);

        Job job = new Job();
        job.setId(UUID.randomUUID());
        job.setBookingId(booking.getId());
        job.setActualArrivedAt(OffsetDateTime.now().minusMinutes(10)); // technician HAS arrived

        when(bookingRepository.findByPublicReference("RR-260820-ARRIVED")).thenReturn(Optional.of(booking));
        when(jobService.findByBookingId(booking.getId())).thenReturn(Optional.of(job));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenReturn(booking);

        assertThatThrownBy(() -> bookingService.cancelBooking("RR-260820-ARRIVED", null, null))
            .isInstanceOf(PostArrivalChargeException.class)
            .hasMessageContaining("299");

        assertThat(booking.getCancellationChargeApplicable()).isTrue();
        assertThat(booking.getCancellationChargeType()).isEqualTo(CancellationChargeType.POST_ARRIVAL_VISIT_CHARGE_APPLICABLE);
    }
}
