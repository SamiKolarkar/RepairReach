package com.repairreach.backend.technician.domain;

import com.repairreach.backend.shared.domain.BaseCreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(
    name = "technician_capability",
    uniqueConstraints = @UniqueConstraint(name = "uk_technician_capability_key", columnNames = {"technician_id", "capability_key"})
)
public class TechnicianCapability extends BaseCreatedEntity {

    @Column(name = "technician_id", nullable = false)
    private UUID technicianId;

    @Column(name = "capability_key", nullable = false, length = 100)
    private String capabilityKey;

    @Column(name = "proficiency_level", nullable = false, length = 50)
    private String proficiencyLevel = "STANDARD";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public UUID getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(UUID technicianId) {
        this.technicianId = technicianId;
    }

    public String getCapabilityKey() {
        return capabilityKey;
    }

    public void setCapabilityKey(String capabilityKey) {
        this.capabilityKey = capabilityKey;
    }

    public String getProficiencyLevel() {
        return proficiencyLevel;
    }

    public void setProficiencyLevel(String proficiencyLevel) {
        this.proficiencyLevel = proficiencyLevel;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }
}
