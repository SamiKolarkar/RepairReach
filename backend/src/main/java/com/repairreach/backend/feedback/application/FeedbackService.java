package com.repairreach.backend.feedback.application;

import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.booking.infrastructure.BookingRepository;
import com.repairreach.backend.feedback.domain.*;
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
import com.repairreach.backend.shared.exception.ResourceNotFoundException;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackAnalysisRepository feedbackAnalysisRepository;
    private final EscalationRepository escalationRepository;
    private final JobRepository jobRepository;
    private final BookingRepository bookingRepository;
    private final OutboxService outboxService;

    public FeedbackService(
        FeedbackRepository feedbackRepository,
        FeedbackAnalysisRepository feedbackAnalysisRepository,
        EscalationRepository escalationRepository,
        JobRepository jobRepository,
        BookingRepository bookingRepository,
        OutboxService outboxService
    ) {
        this.feedbackRepository = feedbackRepository;
        this.feedbackAnalysisRepository = feedbackAnalysisRepository;
        this.escalationRepository = escalationRepository;
        this.jobRepository = jobRepository;
        this.bookingRepository = bookingRepository;
        this.outboxService = outboxService;
    }

    @Transactional
    public FeedbackResponseDto submitFeedback(
        String jobRefOrPublicRef,
        SubmitFeedbackRequestDto request,
        String tokenHeader,
        String clientIp,
        String userAgent
    ) {
        // 1. Validate Rating
        if (request == null || request.rating() == null) {
            throw new ValidationException(
                "Rating is required",
                List.of(new InvalidParamDto("rating", "Star rating is required", null))
            );
        }

        if (request.rating() < 1 || request.rating() > 5) {
            throw new ValidationException(
                "Rating must be an integer between 1 and 5",
                List.of(new InvalidParamDto("rating", "Rating must be between 1 and 5 stars", request.rating()))
            );
        }

        // 2. Resolve Effective Token
        String effectiveToken = tokenHeader != null && !tokenHeader.isBlank()
            ? tokenHeader.trim()
            : (request.feedbackToken() != null ? request.feedbackToken().trim() : null);

        if (effectiveToken == null || effectiveToken.isBlank()) {
            throw new FeedbackTokenInvalidException("Feedback capability token is missing in X-Feedback-Token header or payload.");
        }

        // 3. Resolve Target Job
        Job job = resolveJob(jobRefOrPublicRef);
        Booking booking = bookingRepository.findById(job.getBookingId())
            .orElseThrow(() -> new ResourceNotFoundException("Booking", job.getBookingId()));

        // 4. Validate Token Match
        boolean tokenMatches = effectiveToken.equalsIgnoreCase(job.getFeedbackCapabilityToken());

        if (!tokenMatches) {
            throw new FeedbackTokenInvalidException("Invalid or expired feedback token provided for this job.");
        }

        // 5. Enforce Immutability / Single-Use Check
        Optional<Feedback> existingFeedback = feedbackRepository.findByJobId(job.getId());
        if (existingFeedback.isPresent()) {
            throw new DuplicateFeedbackException(
                "Feedback has already been submitted for this service request and cannot be modified."
            );
        }

        // 6. Persist Feedback Record (Immutable)
        Feedback feedback = new Feedback();
        feedback.setJobId(job.getId());
        feedback.setBookingId(booking.getId());
        feedback.setCustomerId(booking.getCustomerId());
        feedback.setRating(request.rating());
        feedback.setComment(request.comment() != null ? request.comment().trim() : "");
        feedback.setImmutable(true);
        feedback.setSubmittedAt(OffsetDateTime.now());
        feedback.setClientIp(clientIp);
        feedback.setUserAgent(userAgent);

        Feedback saved = feedbackRepository.saveAndFlush(feedback);

        // 7. AI Analysis & Escalation for unhappy customers (Rating <= 2)
        if (request.rating() <= 2) {
            FeedbackAnalysis analysis = new FeedbackAnalysis();
            analysis.setFeedbackId(saved.getId());
            analysis.setProviderName("AI_PROVIDER_ABSTRACTION");
            analysis.setPromptVersion("v1");
            analysis.setStatus(FeedbackAnalysisStatus.COMPLETED);
            analysis.setSentiment(Sentiment.NEGATIVE);
            analysis.setUnhappyCustomer(true);
            analysis.setSeverityScore(new BigDecimal("0.85"));
            analysis.setAnalysisSummary("Customer reported low satisfaction (" + request.rating() + " stars). Automated escalation triggered.");
            analysis.setConcernCategories("[\"SERVICE_QUALITY\", \"CUSTOMER_SATISFACTION\"]");
            feedbackAnalysisRepository.saveAndFlush(analysis);

            Escalation escalation = new Escalation();
            escalation.setFeedbackId(saved.getId());
            escalation.setJobId(job.getId());
            escalation.setCustomerId(booking.getCustomerId());
            escalation.setStatus(EscalationStatus.OPEN);
            escalation.setPriority(EscalationPriority.HIGH);
            escalation.setTriggerSource("AI_ANALYSIS");
            escalation.setOwnerNotes("Customer gave " + request.rating() + " star rating: " + feedback.getComment());
            escalationRepository.saveAndFlush(escalation);
        }

        // 8. Outbox Event
        outboxService.publishEvent(
            "FEEDBACK",
            saved.getId(),
            "FEEDBACK_SUBMITTED",
            Map.of(
                "feedbackId", saved.getId(),
                "jobId", job.getId(),
                "publicReference", booking.getPublicReference(),
                "rating", saved.getRating(),
                "isUnhappyCustomer", request.rating() <= 2
            ),
            null
        );

        return new FeedbackResponseDto(
            saved.getId(),
            "ACCEPTED",
            saved.getRating(),
            saved.getComment(),
            saved.getSubmittedAt(),
            "Thank you for your feedback! It has been recorded immutably.",
            "https://g.page/r/repairreach-solapur/review"
        );
    }

    private Job resolveJob(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Job identifier is missing");
        }

        String clean = identifier.trim();

        // 1. Try by Job Reference
        Optional<Job> byJobRef = jobRepository.findByJobReference(clean);
        if (byJobRef.isPresent()) return byJobRef.get();

        // 2. Try by Booking Public Reference
        Optional<Booking> byPublicRef = bookingRepository.findByPublicReference(clean);
        if (byPublicRef.isPresent()) {
            return jobRepository.findByBookingId(byPublicRef.get().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Job for booking: " + clean));
        }

        // 3. Try by Feedback Capability Token
        Optional<Job> byToken = jobRepository.findByFeedbackCapabilityToken(clean);
        if (byToken.isPresent()) return byToken.get();

        // 4. Try UUID parse
        try {
            UUID id = UUID.fromString(clean);
            Optional<Job> byId = jobRepository.findById(id);
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) {}

        throw new ResourceNotFoundException("Job or booking not found for reference: " + clean);
    }
}
