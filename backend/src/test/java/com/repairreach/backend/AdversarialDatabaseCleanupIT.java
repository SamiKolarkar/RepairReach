package com.repairreach.backend;

import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.booking.domain.BookingState;
import com.repairreach.backend.booking.infrastructure.BookingRepository;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.domain.CustomerAddress;
import com.repairreach.backend.customer.domain.CustomerDevice;
import com.repairreach.backend.customer.infrastructure.CustomerAddressRepository;
import com.repairreach.backend.customer.infrastructure.CustomerDeviceRepository;
import com.repairreach.backend.customer.infrastructure.CustomerRepository;
import com.repairreach.backend.feedback.domain.Escalation;
import com.repairreach.backend.feedback.domain.EscalationPriority;
import com.repairreach.backend.feedback.domain.EscalationStatus;
import com.repairreach.backend.feedback.domain.Feedback;
import com.repairreach.backend.feedback.domain.FeedbackAnalysis;
import com.repairreach.backend.feedback.domain.FeedbackAnalysisStatus;
import com.repairreach.backend.feedback.infrastructure.EscalationRepository;
import com.repairreach.backend.feedback.infrastructure.FeedbackAnalysisRepository;
import com.repairreach.backend.feedback.infrastructure.FeedbackRepository;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.job.domain.JobEvent;
import com.repairreach.backend.job.domain.JobState;
import com.repairreach.backend.job.infrastructure.JobEventRepository;
import com.repairreach.backend.job.infrastructure.JobRepository;
import com.repairreach.backend.notify.domain.NotificationAttempt;
import com.repairreach.backend.notify.domain.NotificationChannel;
import com.repairreach.backend.notify.domain.OutboxEvent;
import com.repairreach.backend.notify.domain.OutboxStatus;
import com.repairreach.backend.notify.infrastructure.NotificationAttemptRepository;
import com.repairreach.backend.notify.infrastructure.OutboxEventRepository;
import com.repairreach.backend.scheduling.domain.ScheduleActivityType;
import com.repairreach.backend.scheduling.domain.ScheduleEntry;
import com.repairreach.backend.scheduling.domain.ScheduleEntryStatus;
import com.repairreach.backend.scheduling.domain.ScheduleRevision;
import com.repairreach.backend.scheduling.infrastructure.ScheduleEntryRepository;
import com.repairreach.backend.scheduling.infrastructure.ScheduleRevisionRepository;
import com.repairreach.backend.shared.domain.AuditEvent;
import com.repairreach.backend.shared.domain.IdempotencyRecord;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.infrastructure.AuditEventRepository;
import com.repairreach.backend.shared.infrastructure.IdempotencyRecordRepository;
import com.repairreach.backend.technician.domain.Technician;
import com.repairreach.backend.technician.infrastructure.TechnicianRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AdversarialDatabaseCleanupIT extends BaseIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerAddressRepository customerAddressRepository;

    @Autowired
    private CustomerDeviceRepository customerDeviceRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private JobEventRepository jobEventRepository;

    @Autowired
    private ScheduleEntryRepository scheduleEntryRepository;

    @Autowired
    private ScheduleRevisionRepository scheduleRevisionRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private FeedbackAnalysisRepository feedbackAnalysisRepository;

    @Autowired
    private EscalationRepository escalationRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private NotificationAttemptRepository notificationAttemptRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    private static final String TARGET_DATE = "2026-09-01";
    private static final String TARGET_SLOT = "slot-10-11";

    @Test
    @Order(1)
    @DisplayName("Adversarial Test 1: Full 16-table graph insertion and cleanTransactionalTables execution")
    void shouldCleanComplete16TableDependencyGraphWithoutFkViolation() {
        UUID businessId = TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID;
        ServiceOffering service = serviceOfferingRepository.findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(businessId).getFirst();
        Technician technician = technicianRepository.findByBusinessIdAndIsActiveTrue(businessId).getFirst();

        // 1. Customer
        Customer customer = new Customer();
        customer.setBusinessId(businessId);
        customer.setFullName("Stress Customer");
        customer.setNormalizedPhone("+919999900001");
        customer = customerRepository.saveAndFlush(customer);

        // 2. Customer Address
        CustomerAddress address = new CustomerAddress();
        address.setCustomerId(customer.getId());
        address.setAddressLine("Stress Address 101");
        address = customerAddressRepository.saveAndFlush(address);

        // 3. Customer Device
        CustomerDevice device = new CustomerDevice();
        device.setCustomerId(customer.getId());
        device.setApplianceType("Washing Machine");
        device = customerDeviceRepository.saveAndFlush(device);

        // 4. Booking
        Booking booking = new Booking();
        booking.setBusinessId(businessId);
        booking.setPublicReference("RR-STRESS-" + UUID.randomUUID().toString().substring(0, 8));
        booking.setCustomerId(customer.getId());
        booking.setServiceOfferingId(service.getId());
        booking.setCustomerAddressId(address.getId());
        booking.setCustomerNameSnapshot(customer.getFullName());
        booking.setCustomerPhoneSnapshot(customer.getNormalizedPhone());
        booking.setServiceNameSnapshot(service.getName());
        booking.setAddressSnapshot(address.getAddressLine());
        booking.setProblemDescription("Stress test problem");
        booking.setState(BookingState.CONFIRMED);
        booking.setRequestedSlotStart(OffsetDateTime.now());
        booking.setRequestedSlotEnd(OffsetDateTime.now().plusHours(1));
        booking = bookingRepository.saveAndFlush(booking);

        // 5. Job
        Job job = new Job();
        job.setBusinessId(businessId);
        job.setBookingId(booking.getId());
        job.setJobReference("JOB-STRESS-" + UUID.randomUUID().toString().substring(0, 8));
        job.setCustomerId(customer.getId());
        job.setState(JobState.SCHEDULED);
        job.setPlannedStartTime(OffsetDateTime.now());
        job.setPlannedEndTime(OffsetDateTime.now().plusHours(1));
        job = jobRepository.saveAndFlush(job);

        // 6. Job Event
        JobEvent event = new JobEvent();
        event.setJobId(job.getId());
        event.setFromState(JobState.ASSIGNMENT_PENDING);
        event.setToState(JobState.SCHEDULED);
        event.setReason("Stress assigned");
        jobEventRepository.saveAndFlush(event);

        // 7. Schedule Entry
        ScheduleEntry scheduleEntry = new ScheduleEntry();
        scheduleEntry.setBusinessId(businessId);
        scheduleEntry.setTechnicianId(technician.getId());
        scheduleEntry.setJobId(job.getId());
        scheduleEntry.setBookingId(booking.getId());
        scheduleEntry.setActivityType(ScheduleActivityType.HOME_VISIT);
        scheduleEntry.setStartTime(OffsetDateTime.now().plusDays(10));
        scheduleEntry.setEndTime(OffsetDateTime.now().plusDays(10).plusHours(1));
        scheduleEntry.setStatus(ScheduleEntryStatus.ACTIVE);
        scheduleEntry = scheduleEntryRepository.saveAndFlush(scheduleEntry);

        // 8. Schedule Revision
        ScheduleRevision revision = new ScheduleRevision();
        revision.setScheduleEntryId(scheduleEntry.getId());
        revision.setCommandName("STRESS_TEST");
        revision.setOldStartTime(scheduleEntry.getStartTime());
        revision.setOldEndTime(scheduleEntry.getEndTime());
        revision.setNewStartTime(scheduleEntry.getStartTime());
        revision.setNewEndTime(scheduleEntry.getEndTime());
        revision.setActorType("TEST");
        scheduleRevisionRepository.saveAndFlush(revision);

        // 9. Feedback
        Feedback feedback = new Feedback();
        feedback.setJobId(job.getId());
        feedback.setBookingId(booking.getId());
        feedback.setCustomerId(customer.getId());
        feedback.setRating(5);
        feedback.setComment("Stress feedback");
        feedback = feedbackRepository.saveAndFlush(feedback);

        // 10. Feedback Analysis
        FeedbackAnalysis analysis = new FeedbackAnalysis();
        analysis.setFeedbackId(feedback.getId());
        analysis.setStatus(FeedbackAnalysisStatus.COMPLETED);
        feedbackAnalysisRepository.saveAndFlush(analysis);

        // 11. Escalation
        Escalation escalation = new Escalation();
        escalation.setFeedbackId(feedback.getId());
        escalation.setJobId(job.getId());
        escalation.setCustomerId(customer.getId());
        escalation.setStatus(EscalationStatus.OPEN);
        escalation.setPriority(EscalationPriority.LOW);
        escalationRepository.saveAndFlush(escalation);

        // 12. Outbox Event
        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("TEST");
        outbox.setAggregateId(UUID.randomUUID());
        outbox.setEventType("TEST_EVENT");
        outbox.setPayload("{\"test\": true}");
        outbox.setStatus(OutboxStatus.PENDING);
        outbox = outboxEventRepository.saveAndFlush(outbox);

        // 13. Notification Attempt
        NotificationAttempt attempt = new NotificationAttempt();
        attempt.setOutboxEventId(outbox.getId());
        attempt.setChannel(NotificationChannel.SMS);
        attempt.setRecipient("+919999900001");
        attempt.setPayloadSummary("Stress summary");
        notificationAttemptRepository.saveAndFlush(attempt);

        // 14. Audit Event
        AuditEvent audit = new AuditEvent();
        audit.setAggregateType("TEST");
        audit.setAggregateId(UUID.randomUUID());
        audit.setAction("TEST_ACTION");
        auditEventRepository.saveAndFlush(audit);

        // 15. Idempotency Record
        IdempotencyRecord idemp = new IdempotencyRecord();
        idemp.setScope("TEST_SCOPE");
        idemp.setIdempotencyKey("idemp-" + UUID.randomUUID());
        idemp.setRequestHash("hash123");
        idemp.setResponseStatus(200);
        idemp.setResponseBody("{\"status\": \"OK\"}");
        idemp.setExpiresAt(OffsetDateTime.now().plusDays(1));
        idempotencyRecordRepository.saveAndFlush(idemp);

        // Explicitly execute cleanTransactionalTables() and verify NO FK violation occurs
        assertThatCode(() -> cleanTransactionalTables()).doesNotThrowAnyException();

        // Verify all 16 transactional tables are completely empty (0 rows)
        List<String> transactionalTables = List.of(
            "feedback_analysis", "escalation", "feedback", "notification_attempt",
            "outbox_event", "schedule_revision", "schedule_entry", "assignment",
            "job_event", "job", "booking", "customer_device",
            "customer_address", "customer", "idempotency_record", "audit_event"
        );

        for (String table : transactionalTables) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
            assertThat(count).withFailMessage("Table " + table + " should have 0 rows after cleanup").isEqualTo(0);
        }
    }

    @RepeatedTest(3)
    @Order(2)
    @DisplayName("Adversarial Test 2: Booking identical slot repeatedly across test method boundaries must not collide")
    void shouldAllowBookingIdenticalSlotRepeatedlyWithoutGiSTCollision() {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        CreateBookingRequestDto bookingReq = new CreateBookingRequestDto(
            "Repeated Booker",
            "+91 98888 77771",
            service.getId(),
            "100 Hotgi Road, Solapur",
            "Repeated booking slot check",
            TARGET_DATE,
            TARGET_SLOT,
            "10:00",
            "11:00"
        );

        // Each repeated run starts with cleanTransactionalTables() from @BeforeEach
        BookingConfirmationResponseDto booking = bookingService.createBooking(bookingReq, UUID.randomUUID().toString(), null);
        assertThat(booking).isNotNull();
        assertThat(booking.status()).isEqualTo("CONFIRMED");
        assertThat(booking.scheduledDate()).isEqualTo(TARGET_DATE);
    }

    @Test
    @Order(3)
    @DisplayName("Adversarial Test 3: Verify seed tables are untouched after destructive stress testing")
    void shouldEnsureSeedDataIsIntact() {
        Integer businessCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM business", Integer.class);
        Integer serviceCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM service_offering", Integer.class);
        Integer technicianCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM technician", Integer.class);
        Integer rulesCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM availability_rule", Integer.class);
        Integer testimonialCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM testimonial", Integer.class);

        assertThat(businessCount).isGreaterThanOrEqualTo(1);
        assertThat(serviceCount).isEqualTo(5);
        assertThat(technicianCount).isGreaterThanOrEqualTo(1);
        assertThat(rulesCount).isGreaterThanOrEqualTo(19);
        assertThat(testimonialCount).isGreaterThanOrEqualTo(4);
    }
}
