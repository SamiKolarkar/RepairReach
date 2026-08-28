package com.repairreach.backend.assignment.application;

import com.repairreach.backend.assignment.domain.Assignment;
import com.repairreach.backend.assignment.domain.AssignmentStatus;
import com.repairreach.backend.assignment.infrastructure.AssignmentRepository;
import com.repairreach.backend.technician.domain.Technician;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AssignmentPolicyService {

    private final AssignmentRepository assignmentRepository;

    public AssignmentPolicyService(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    @Transactional
    public Assignment assignTechnician(UUID jobId, Technician technician) {
        // Supersede previous current assignments if any
        assignmentRepository.findByJobIdAndIsCurrentTrue(jobId)
            .ifPresent(prev -> {
                prev.setCurrent(false);
                prev.setStatus(AssignmentStatus.SUPERSEDED);
                assignmentRepository.save(prev);
            });

        Assignment assignment = new Assignment();
        assignment.setJobId(jobId);
        assignment.setTechnicianId(technician.getId());
        assignment.setStatus(AssignmentStatus.ACCEPTED); // Auto-accept default assignment for vertical slice
        assignment.setSelectionReason("DEFAULT_CAPABILITY_POLICY");
        assignment.setSelectionPolicyVersion("v1");
        assignment.setAssignedAt(OffsetDateTime.now());
        assignment.setAcceptedAt(OffsetDateTime.now());
        assignment.setCurrent(true);

        return assignmentRepository.saveAndFlush(assignment);
    }

    public Optional<Assignment> getCurrentAssignment(UUID jobId) {
        return assignmentRepository.findByJobIdAndIsCurrentTrue(jobId);
    }
}
