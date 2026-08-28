package com.repairreach.backend.catalog.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.util.UUID;

@Entity
@Table(name = "service_offering")
public class ServiceOffering extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "category", nullable = false)
    private ServiceCategory category = ServiceCategory.HOME_APPLIANCE;

    @Column(name = "base_duration_minutes", nullable = false)
    private Integer baseDurationMinutes = 60;

    @Column(name = "buffer_duration_minutes", nullable = false)
    private Integer bufferDurationMinutes = 0;

    @Column(name = "supports_home_service", nullable = false)
    private Boolean supportsHomeService = true;

    @Column(name = "supports_workshop_repair", nullable = false)
    private Boolean supportsWorkshopRepair = true;

    @Column(name = "supports_device_transfer", nullable = false)
    private Boolean supportsDeviceTransfer = true;

    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = true;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ServiceCategory getCategory() {
        return category;
    }

    public void setCategory(ServiceCategory category) {
        this.category = category;
    }

    public Integer getBaseDurationMinutes() {
        return baseDurationMinutes;
    }

    public void setBaseDurationMinutes(Integer baseDurationMinutes) {
        this.baseDurationMinutes = baseDurationMinutes;
    }

    public Integer getBufferDurationMinutes() {
        return bufferDurationMinutes;
    }

    public void setBufferDurationMinutes(Integer bufferDurationMinutes) {
        this.bufferDurationMinutes = bufferDurationMinutes;
    }

    public Boolean getSupportsHomeService() {
        return supportsHomeService;
    }

    public void setSupportsHomeService(Boolean supportsHomeService) {
        this.supportsHomeService = supportsHomeService;
    }

    public Boolean getSupportsWorkshopRepair() {
        return supportsWorkshopRepair;
    }

    public void setSupportsWorkshopRepair(Boolean supportsWorkshopRepair) {
        this.supportsWorkshopRepair = supportsWorkshopRepair;
    }

    public Boolean getSupportsDeviceTransfer() {
        return supportsDeviceTransfer;
    }

    public void setSupportsDeviceTransfer(Boolean supportsDeviceTransfer) {
        this.supportsDeviceTransfer = supportsDeviceTransfer;
    }

    public Boolean getPublished() {
        return isPublished;
    }

    public void setPublished(Boolean published) {
        isPublished = published;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}
