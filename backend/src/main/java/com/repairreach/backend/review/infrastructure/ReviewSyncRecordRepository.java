package com.repairreach.backend.review.infrastructure;

import com.repairreach.backend.review.domain.ReviewSyncRecord;
import com.repairreach.backend.review.domain.ReviewSyncStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewSyncRecordRepository extends JpaRepository<ReviewSyncRecord, UUID> {
    List<ReviewSyncRecord> findByBusinessIdAndProviderAndSyncStatus(UUID businessId, String provider, ReviewSyncStatus status);
}
