package com.repairreach.backend.catalog.domain;

import com.repairreach.backend.shared.domain.BaseCreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "service_requirement")
public class ServiceRequirement extends BaseCreatedEntity {

    @Column(name = "service_offering_id", nullable = false)
    private UUID serviceOfferingId;

    @Column(name = "requirement_key", nullable = false, length = 100)
    private String requirementKey;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = true;

    public UUID getServiceOfferingId() {
        return serviceOfferingId;
    }

    public void setServiceOfferingId(UUID serviceOfferingId) {
        this.serviceOfferingId = serviceOfferingId;
    }

    public String getRequirementKey() {
        return requirementKey;
    }

    public void setRequirementKey(String requirementKey) {
        this.requirementKey = requirementKey;
    }

    public Boolean getMandatory() {
        return isMandatory;
    }

    public void setMandatory(Boolean mandatory) {
        isMandatory = mandatory;
    }
}
