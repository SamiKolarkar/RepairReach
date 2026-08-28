package com.repairreach.backend.booking.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "booking")
public class Booking extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "public_reference", nullable = false, unique = true, length = 64)
    private String publicReference;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "service_offering_id", nullable = false)
    private UUID serviceOfferingId;

    @Column(name = "customer_address_id")
    private UUID customerAddressId;

    @Column(name = "customer_name_snapshot", nullable = false)
    private String customerNameSnapshot;

    @Column(name = "customer_phone_snapshot", nullable = false, length = 20)
    private String customerPhoneSnapshot;

    @Column(name = "service_name_snapshot", nullable = false)
    private String serviceNameSnapshot;

    @Column(name = "address_snapshot", nullable = false)
    private String addressSnapshot;

    @Column(name = "problem_description", nullable = false)
    private String problemDescription;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "state", nullable = false)
    private BookingState state = BookingState.REQUESTED;

    @Column(name = "requested_slot_start", nullable = false)
    private OffsetDateTime requestedSlotStart;

    @Column(name = "requested_slot_end", nullable = false)
    private OffsetDateTime requestedSlotEnd;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancellation_charge_applicable", nullable = false)
    private Boolean cancellationChargeApplicable = false;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "cancellation_charge_type", nullable = false)
    private CancellationChargeType cancellationChargeType = CancellationChargeType.NONE;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public String getPublicReference() {
        return publicReference;
    }

    public void setPublicReference(String publicReference) {
        this.publicReference = publicReference;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public UUID getServiceOfferingId() {
        return serviceOfferingId;
    }

    public void setServiceOfferingId(UUID serviceOfferingId) {
        this.serviceOfferingId = serviceOfferingId;
    }

    public UUID getCustomerAddressId() {
        return customerAddressId;
    }

    public void setCustomerAddressId(UUID customerAddressId) {
        this.customerAddressId = customerAddressId;
    }

    public String getCustomerNameSnapshot() {
        return customerNameSnapshot;
    }

    public void setCustomerNameSnapshot(String customerNameSnapshot) {
        this.customerNameSnapshot = customerNameSnapshot;
    }

    public String getCustomerPhoneSnapshot() {
        return customerPhoneSnapshot;
    }

    public void setCustomerPhoneSnapshot(String customerPhoneSnapshot) {
        this.customerPhoneSnapshot = customerPhoneSnapshot;
    }

    public String getServiceNameSnapshot() {
        return serviceNameSnapshot;
    }

    public void setServiceNameSnapshot(String serviceNameSnapshot) {
        this.serviceNameSnapshot = serviceNameSnapshot;
    }

    public String getAddressSnapshot() {
        return addressSnapshot;
    }

    public void setAddressSnapshot(String addressSnapshot) {
        this.addressSnapshot = addressSnapshot;
    }

    public String getProblemDescription() {
        return problemDescription;
    }

    public void setProblemDescription(String problemDescription) {
        this.problemDescription = problemDescription;
    }

    public BookingState getState() {
        return state;
    }

    public void setState(BookingState state) {
        this.state = state;
    }

    public OffsetDateTime getRequestedSlotStart() {
        return requestedSlotStart;
    }

    public void setRequestedSlotStart(OffsetDateTime requestedSlotStart) {
        this.requestedSlotStart = requestedSlotStart;
    }

    public OffsetDateTime getRequestedSlotEnd() {
        return requestedSlotEnd;
    }

    public void setRequestedSlotEnd(OffsetDateTime requestedSlotEnd) {
        this.requestedSlotEnd = requestedSlotEnd;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public OffsetDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(OffsetDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public Boolean getCancellationChargeApplicable() {
        return cancellationChargeApplicable;
    }

    public void setCancellationChargeApplicable(Boolean cancellationChargeApplicable) {
        this.cancellationChargeApplicable = cancellationChargeApplicable;
    }

    public CancellationChargeType getCancellationChargeType() {
        return cancellationChargeType;
    }

    public void setCancellationChargeType(CancellationChargeType cancellationChargeType) {
        this.cancellationChargeType = cancellationChargeType;
    }
}
