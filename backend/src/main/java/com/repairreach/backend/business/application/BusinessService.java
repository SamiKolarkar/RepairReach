package com.repairreach.backend.business.application;

import com.repairreach.backend.business.domain.Business;
import com.repairreach.backend.business.domain.BusinessLocation;
import com.repairreach.backend.business.domain.BusinessSettings;
import com.repairreach.backend.business.infrastructure.BusinessLocationRepository;
import com.repairreach.backend.business.infrastructure.BusinessRepository;
import com.repairreach.backend.business.infrastructure.BusinessSettingsRepository;
import com.repairreach.backend.business.web.dto.BusinessProfileDto;
import com.repairreach.backend.business.web.dto.DayOperatingHoursDto;
import com.repairreach.backend.business.web.dto.VisitingChargeDto;
import com.repairreach.backend.business.web.dto.WorkingHoursDto;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessSettingsRepository businessSettingsRepository;
    private final BusinessLocationRepository businessLocationRepository;

    @Value("${app.business.default-code:SOLAPUR_MAIN}")
    private String defaultBusinessCode;

    public BusinessService(
        BusinessRepository businessRepository,
        BusinessSettingsRepository businessSettingsRepository,
        BusinessLocationRepository businessLocationRepository
    ) {
        this.businessRepository = businessRepository;
        this.businessSettingsRepository = businessSettingsRepository;
        this.businessLocationRepository = businessLocationRepository;
    }

    public Business getBusiness(UUID businessId) {
        return businessRepository.findById(businessId)
            .orElseThrow(() -> new ResourceNotFoundException("Business", businessId));
    }

    public Business getDefaultBusiness() {
        return businessRepository.findByCode(defaultBusinessCode)
            .or(businessRepository::findFirstByIsActiveTrue)
            .orElseThrow(() -> new ResourceNotFoundException("Default business not found: " + defaultBusinessCode));
    }

    public BusinessSettings getBusinessSettings(UUID businessId) {
        return businessSettingsRepository.findByBusinessId(businessId)
            .orElseGet(() -> {
                BusinessSettings defaultSettings = new BusinessSettings();
                defaultSettings.setBusinessId(businessId);
                return defaultSettings;
            });
    }

    public BusinessProfileDto getBusinessProfile() {
        Business business = getDefaultBusiness();
        BusinessSettings settings = getBusinessSettings(business.getId());
        List<BusinessLocation> locations = businessLocationRepository.findByBusinessId(business.getId());

        String address = business.getAddress();
        if (!locations.isEmpty()) {
            address = locations.stream()
                .filter(BusinessLocation::getPrimary)
                .findFirst()
                .map(BusinessLocation::getAddress)
                .orElse(locations.getFirst().getAddress());
        }

        BigDecimal chargeAmount = settings.getVisitingChargeAmount() != null ? settings.getVisitingChargeAmount() : new BigDecimal("299.00");
        String currency = settings.getCurrency() != null ? settings.getCurrency() : "INR";
        String formattedCharge = "₹" + chargeAmount.stripTrailingZeros().toPlainString();
        VisitingChargeDto visitingCharge = new VisitingChargeDto(chargeAmount, currency, formattedCharge);

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");
        String weekdayFormatted = settings.getWeekdayOpenTime().format(timeFmt) + " - " + settings.getWeekdayCloseTime().format(timeFmt);
        String sundayFormatted = settings.getSundayOpenTime().format(timeFmt) + " - " + settings.getSundayCloseTime().format(timeFmt);
        String breakFormatted = settings.getAfternoonBreakStart().format(timeFmt) + " - " + settings.getAfternoonBreakEnd().format(timeFmt);
        WorkingHoursDto workingHours = new WorkingHoursDto(weekdayFormatted, sundayFormatted, breakFormatted);

        List<DayOperatingHoursDto> operatingHours = new ArrayList<>();
        String[] weekdays = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"};
        for (String day : weekdays) {
            operatingHours.add(new DayOperatingHoursDto(
                day,
                settings.getWeekdayOpenTime().toString().substring(0, 5),
                settings.getWeekdayCloseTime().toString().substring(0, 5),
                false,
                true,
                settings.getAfternoonBreakStart().toString().substring(0, 5),
                settings.getAfternoonBreakEnd().toString().substring(0, 5)
            ));
        }
        operatingHours.add(new DayOperatingHoursDto(
            "SUNDAY",
            settings.getSundayOpenTime().toString().substring(0, 5),
            settings.getSundayCloseTime().toString().substring(0, 5),
            false,
            false,
            null,
            null
        ));

        List<String> trustPillars = List.of(
            "Verified Solapur Technicians",
            "Transparent ₹299 Visiting Charge",
            "Genuine Spare Parts & Repair Warranty"
        );

        return new BusinessProfileDto(
            business.getId(),
            business.getCode(),
            business.getName(),
            business.getName(),
            "Solapur's Trusted Appliance Repair Experts",
            "Fast, reliable doorstep repair for washing machines, refrigerators, microwaves, ACs, and TVs across Solapur.",
            business.getCity(),
            business.getState(),
            business.getPhone(),
            business.getPhone(),
            business.getPhone(),
            business.getEmail(),
            address,
            business.getTimezone(),
            business.getActive(),
            visitingCharge,
            workingHours,
            operatingHours,
            trustPillars,
            "https://g.page/r/repairreach-solapur/review"
        );
    }
}
