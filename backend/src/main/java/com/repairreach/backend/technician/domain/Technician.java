package com.repairreach.backend.technician.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "technician")
public class Technician extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "home_location_lat", precision = 10, scale = 8)
    private BigDecimal homeLocationLat;

    @Column(name = "home_location_lon", precision = 11, scale = 8)
    private BigDecimal homeLocationLon;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public BigDecimal getHomeLocationLat() {
        return homeLocationLat;
    }

    public void setHomeLocationLat(BigDecimal homeLocationLat) {
        this.homeLocationLat = homeLocationLat;
    }

    public BigDecimal getHomeLocationLon() {
        return homeLocationLon;
    }

    public void setHomeLocationLon(BigDecimal homeLocationLon) {
        this.homeLocationLon = homeLocationLon;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }
}
