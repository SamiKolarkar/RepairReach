package com.repairreach.backend.job.application;

import com.repairreach.backend.booking.domain.Booking;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.job.domain.JobEvent;
import com.repairreach.backend.job.domain.JobState;
import com.repairreach.backend.job.infrastructure.JobEventRepository;
import com.repairreach.backend.job.infrastructure.JobRepository;
import com.repairreach.backend.notify.application.OutboxService;
import com.repairreach.backend.shared.exception.ResourceNotFoundException;
import com.repairreach.backend.shared.security.JwtCapabilityTokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final JobEventRepository jobEventRepository;
    private final JwtCapabilityTokenService jwtCapabilityTokenService;
    private final OutboxService outboxService;

    public JobService(
        JobRepository jobRepository,
        JobEventRepository jobEventRepository,
        JwtCapabilityTokenService jwtCapabilityTokenService,
        OutboxService outboxService
    ) {
        this.jobRepository = jobRepository;
        this.jobEventRepository = jobEventRepository;
        this.jwtCapabilityTokenService = jwtCapabilityTokenService;
        this.outboxService = outboxService;
    }

    @Transactional
    public Job createJobForBooking(
        Booking booking,
        Customer customer,
        OffsetDateTime startTime,
        OffsetDateTime endTime
    ) {
        UUID jobId = UUID.randomUUID();
        String jobRef = "JOB-" + booking.getPublicReference();
        String feedbackToken = jwtCapabilityTokenService.createFeedbackToken(
            jobId,
            customer.getId(),
            jobRef,
            86400 * 30 // 30 days
        );

        Job job = new Job();
        job.setId(jobId);
        job.setBusinessId(booking.getBusinessId());
        job.setBookingId(booking.getId());
        job.setJobReference(jobRef);
        job.setCustomerId(customer.getId());
        job.setState(JobState.SCHEDULED);
        job.setPlannedStartTime(startTime);
        job.setPlannedEndTime(endTime);
        job.setFeedbackCapabilityToken(feedbackToken);
        job.setFeedbackTokenExpiresAt(endTime.plusDays(30));

        Job savedJob = jobRepository.saveAndFlush(job);

        JobEvent event = new JobEvent();
        event.setJobId(savedJob.getId());
        event.setFromState(null);
        event.setToState(JobState.SCHEDULED);
        event.setActorType("SYSTEM");
        event.setReason("Job automatically scheduled upon customer booking confirmation");
        jobEventRepository.saveAndFlush(event);

        return savedJob;
    }

    @Transactional
    public Job completeJob(UUID jobId, String completionNotes) {
        Job job = getJob(jobId);
        JobState prevState = job.getState();
        job.setState(JobState.COMPLETED);
        job.setActualCompletedAt(OffsetDateTime.now());
        job.setCompletionNotes(completionNotes != null ? completionNotes : "Service completed successfully");

        if (job.getFeedbackCapabilityToken() == null) {
            String token = jwtCapabilityTokenService.createFeedbackToken(
                job.getId(),
                job.getCustomerId(),
                job.getJobReference(),
                86400 * 30
            );
            job.setFeedbackCapabilityToken(token);
            job.setFeedbackTokenExpiresAt(OffsetDateTime.now().plusDays(30));
        }

        Job saved = jobRepository.saveAndFlush(job);
        recordJobEvent(saved.getId(), prevState, JobState.COMPLETED, "Job completed by technician");

        // Automatically dispatch feedback notification outbox event
        outboxService.publishEvent(
            "JOB",
            saved.getId(),
            "JOB_COMPLETED_FEEDBACK_REQUESTED",
            Map.of(
                "jobId", saved.getId(),
                "jobReference", saved.getJobReference(),
                "feedbackToken", saved.getFeedbackCapabilityToken()
            ),
            null
        );

        return saved;
    }

    @Transactional
    public void recordJobEvent(UUID jobId, JobState fromState, JobState toState, String reason) {
        JobEvent event = new JobEvent();
        event.setJobId(jobId);
        event.setFromState(fromState);
        event.setToState(toState);
        event.setActorType("SYSTEM");
        event.setReason(reason);
        jobEventRepository.saveAndFlush(event);
    }

    public Optional<Job> findByBookingId(UUID bookingId) {
        return jobRepository.findByBookingId(bookingId);
    }

    public Optional<Job> findByJobReference(String jobReference) {
        return jobRepository.findByJobReference(jobReference);
    }

    public Optional<Job> findByFeedbackCapabilityToken(String token) {
        return jobRepository.findByFeedbackCapabilityToken(token);
    }

    public Job getJob(UUID jobId) {
        return jobRepository.findById(jobId)
            .orElseThrow(() -> new ResourceNotFoundException("Job", jobId));
    }

    @Transactional
    public Job saveJob(Job job) {
        return jobRepository.saveAndFlush(job);
    }
}
