package com.repairreach.backend.feedback;

import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.booking.infrastructure.BookingRepository;
import com.repairreach.backend.feedback.application.FeedbackService;
import com.repairreach.backend.feedback.domain.Escalation;
import com.repairreach.backend.feedback.domain.Feedback;
import com.repairreach.backend.feedback.domain.FeedbackAnalysis;
import com.repairreach.backend.feedback.infrastructure.EscalationRepository;
import com.repairreach.backend.feedback.infrastructure.FeedbackAnalysisRepository;
import com.repairreach.backend.feedback.infrastructure.FeedbackRepository;
import com.repairreach.backend.feedback.web.dto.FeedbackResponseDto;
import com.repairreach.backend.feedback.web.dto.SubmitFeedbackRequestDto;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.job.infrastructure.JobRepository;
import com.repairreach.backend.notify.application.OutboxService;
import com.repairreach.backend.shared.exception.DuplicateFeedbackException;
import com.repairreach.backend.shared.exception.FeedbackTokenInvalidException;
import com.repairreach.backend.shared.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private FeedbackAnalysisRepository feedbackAnalysisRepository;

    @Mock
    private EscalationRepository escalationRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private OutboxService outboxService;

    @InjectMocks
    private FeedbackService feedbackService;

    private UUID jobId;
    private UUID bookingId;
    private UUID customerId;
    private Job job;
    private Booking booking;
    private String token;

    @BeforeEach
    void setUp() {
        jobId = UUID.randomUUID();
        bookingId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        token = "fb-tok-test-123456";

        booking = new Booking();
        booking.setId(bookingId);
        booking.setCustomerId(customerId);
        booking.setPublicReference("RR-260820-FEE123");

        job = new Job();
        job.setId(jobId);
        job.setBookingId(bookingId);
        job.setJobReference("JOB-RR-260820-FEE123");
        job.setCustomerId(customerId);
        job.setFeedbackCapabilityToken(token);
    }

    @Test
    @DisplayName("Should accept valid 5-star feedback submission")
    void shouldAcceptValidFeedback() {
        SubmitFeedbackRequestDto request = new SubmitFeedbackRequestDto(5, "Great service by Ramesh!", token);

        when(jobRepository.findByJobReference("JOB-RR-260820-FEE123")).thenReturn(Optional.of(job));
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(feedbackRepository.findByJobId(jobId)).thenReturn(Optional.empty());

        when(feedbackRepository.saveAndFlush(any(Feedback.class))).thenAnswer(invocation -> {
            Feedback f = invocation.getArgument(0);
            f.setId(UUID.randomUUID());
            return f;
        });

        FeedbackResponseDto response = feedbackService.submitFeedback(
            "JOB-RR-260820-FEE123",
            request,
            token,
            "127.0.0.1",
            "JUnit"
        );

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("ACCEPTED");
        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.comment()).isEqualTo("Great service by Ramesh!");
        assertThat(response.googleReviewUrl()).isNotNull();

        verify(outboxService, times(1)).publishEvent(eq("FEEDBACK"), any(), eq("FEEDBACK_SUBMITTED"), any(), isNull());
    }

    @Test
    @DisplayName("Should reject invalid ratings (< 1 or > 5)")
    void shouldRejectInvalidRatings() {
        SubmitFeedbackRequestDto lowRating = new SubmitFeedbackRequestDto(0, "Terrible", token);
        SubmitFeedbackRequestDto highRating = new SubmitFeedbackRequestDto(6, "Beyond 5", token);

        assertThatThrownBy(() -> feedbackService.submitFeedback("JOB-REF", lowRating, token, null, null))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("between 1 and 5");

        assertThatThrownBy(() -> feedbackService.submitFeedback("JOB-REF", highRating, token, null, null))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("between 1 and 5");
    }

    @Test
    @DisplayName("Should reject invalid or forged token with 401 FeedbackTokenInvalidException")
    void shouldRejectForgedToken() {
        SubmitFeedbackRequestDto request = new SubmitFeedbackRequestDto(5, "Nice", "forged-token");

        when(jobRepository.findByJobReference("JOB-RR-260820-FEE123")).thenReturn(Optional.of(job));
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> feedbackService.submitFeedback("JOB-RR-260820-FEE123", request, "wrong-header-token", null, null))
            .isInstanceOf(FeedbackTokenInvalidException.class)
            .hasMessageContaining("Invalid or expired feedback token");
    }

    @Test
    @DisplayName("Should reject duplicate feedback on same job with 409 DuplicateFeedbackException")
    void shouldRejectDuplicateFeedback() {
        SubmitFeedbackRequestDto request = new SubmitFeedbackRequestDto(4, "Second try", token);

        when(jobRepository.findByJobReference("JOB-RR-260820-FEE123")).thenReturn(Optional.of(job));
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Feedback existing = new Feedback();
        existing.setId(UUID.randomUUID());
        existing.setJobId(jobId);
        existing.setRating(5);
        when(feedbackRepository.findByJobId(jobId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> feedbackService.submitFeedback("JOB-RR-260820-FEE123", request, token, null, null))
            .isInstanceOf(DuplicateFeedbackException.class)
            .hasMessageContaining("already been submitted");
    }

    @Test
    @DisplayName("Should automatically trigger AI analysis and escalation on low rating (<= 2)")
    void shouldTriggerEscalationOnLowRating() {
        SubmitFeedbackRequestDto request = new SubmitFeedbackRequestDto(1, "Appliance broke down again next day", token);

        when(jobRepository.findByJobReference("JOB-RR-260820-FEE123")).thenReturn(Optional.of(job));
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(feedbackRepository.findByJobId(jobId)).thenReturn(Optional.empty());

        when(feedbackRepository.saveAndFlush(any(Feedback.class))).thenAnswer(invocation -> {
            Feedback f = invocation.getArgument(0);
            f.setId(UUID.randomUUID());
            return f;
        });

        FeedbackResponseDto response = feedbackService.submitFeedback(
            "JOB-RR-260820-FEE123",
            request,
            token,
            "127.0.0.1",
            "JUnit"
        );

        assertThat(response).isNotNull();
        assertThat(response.rating()).isEqualTo(1);

        verify(feedbackAnalysisRepository, times(1)).saveAndFlush(any(FeedbackAnalysis.class));
        verify(escalationRepository, times(1)).saveAndFlush(any(Escalation.class));
    }
}
