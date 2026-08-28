package com.repairreach.backend.business.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "business_settings")
public class BusinessSettings extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false, unique = true)
    private UUID businessId;

    @Column(name = "weekday_open_time", nullable = false)
    private LocalTime weekdayOpenTime = LocalTime.of(9, 0);

    @Column(name = "weekday_close_time", nullable = false)
    private LocalTime weekdayCloseTime = LocalTime.of(19, 0);

    @Column(name = "sunday_open_time", nullable = false)
    private LocalTime sundayOpenTime = LocalTime.of(9, 0);

    @Column(name = "sunday_close_time", nullable = false)
    private LocalTime sundayCloseTime = LocalTime.of(14, 0);

    @Column(name = "afternoon_break_start", nullable = false)
    private LocalTime afternoonBreakStart = LocalTime.of(14, 0);

    @Column(name = "afternoon_break_end", nullable = false)
    private LocalTime afternoonBreakEnd = LocalTime.of(16, 0);

    @Column(name = "default_slot_duration_minutes", nullable = false)
    private Integer defaultSlotDurationMinutes = 60;

    @Column(name = "default_travel_buffer_minutes", nullable = false)
    private Integer defaultTravelBufferMinutes = 30;

    @Column(name = "visiting_charge_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal visitingChargeAmount = new BigDecimal("299.00");

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "INR";

    @Column(name = "max_advance_booking_days", nullable = false)
    private Integer maxAdvanceBookingDays = 14;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public LocalTime getWeekdayOpenTime() {
        return weekdayOpenTime;
    }

    public void setWeekdayOpenTime(LocalTime weekdayOpenTime) {
        this.weekdayOpenTime = weekdayOpenTime;
    }

    public LocalTime getWeekdayCloseTime() {
        return weekdayCloseTime;
    }

    public void setWeekdayCloseTime(LocalTime weekdayCloseTime) {
        this.weekdayCloseTime = weekdayCloseTime;
    }

    public LocalTime getSundayOpenTime() {
        return sundayOpenTime;
    }

    public void setSundayOpenTime(LocalTime sundayOpenTime) {
        this.sundayOpenTime = sundayOpenTime;
    }

    public LocalTime getSundayCloseTime() {
        return sundayCloseTime;
    }

    public void setSundayCloseTime(LocalTime sundayCloseTime) {
        this.sundayCloseTime = sundayCloseTime;
    }

    public LocalTime getAfternoonBreakStart() {
        return afternoonBreakStart;
    }

    public void setAfternoonBreakStart(LocalTime afternoonBreakStart) {
        this.afternoonBreakStart = afternoonBreakStart;
    }

    public LocalTime getAfternoonBreakEnd() {
        return afternoonBreakEnd;
    }

    public void setAfternoonBreakEnd(LocalTime afternoonBreakEnd) {
        this.afternoonBreakEnd = afternoonBreakEnd;
    }

    public Integer getDefaultSlotDurationMinutes() {
        return defaultSlotDurationMinutes;
    }

    public void setDefaultSlotDurationMinutes(Integer defaultSlotDurationMinutes) {
        this.defaultSlotDurationMinutes = defaultSlotDurationMinutes;
    }

    public Integer getDefaultTravelBufferMinutes() {
        return defaultTravelBufferMinutes;
    }

    public void setDefaultTravelBufferMinutes(Integer defaultTravelBufferMinutes) {
        this.defaultTravelBufferMinutes = defaultTravelBufferMinutes;
    }

    public BigDecimal getVisitingChargeAmount() {
        return visitingChargeAmount;
    }

    public void setVisitingChargeAmount(BigDecimal visitingChargeAmount) {
        this.visitingChargeAmount = visitingChargeAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Integer getMaxAdvanceBookingDays() {
        return maxAdvanceBookingDays;
    }

    public void setMaxAdvanceBookingDays(Integer maxAdvanceBookingDays) {
        this.maxAdvanceBookingDays = maxAdvanceBookingDays;
    }
}
