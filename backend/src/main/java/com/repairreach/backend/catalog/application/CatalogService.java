package com.repairreach.backend.catalog.application;

import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.domain.ServiceRequirement;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.catalog.infrastructure.ServiceRequirementRepository;
import com.repairreach.backend.catalog.web.dto.ServiceOfferingDto;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CatalogService {

    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ServiceRequirementRepository serviceRequirementRepository;

    public CatalogService(
        ServiceOfferingRepository serviceOfferingRepository,
        ServiceRequirementRepository serviceRequirementRepository
    ) {
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.serviceRequirementRepository = serviceRequirementRepository;
    }

    public List<ServiceOfferingDto> getPublishedServices() {
        UUID businessId = TenantContext.getBusinessId();
        List<ServiceOffering> offerings = serviceOfferingRepository.findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(businessId);

        return offerings.stream()
            .map(this::toDto)
            .toList();
    }

    public ServiceOffering getServiceById(UUID serviceId) {
        UUID businessId = TenantContext.getBusinessId();
        return serviceOfferingRepository.findByIdAndBusinessId(serviceId, businessId)
            .orElseThrow(() -> new ResourceNotFoundException("ServiceOffering", serviceId));
    }

    public ServiceOfferingDto getServiceDtoById(UUID serviceId) {
        return toDto(getServiceById(serviceId));
    }

    private ServiceOfferingDto toDto(ServiceOffering offering) {
        List<ServiceRequirement> requirements = serviceRequirementRepository.findByServiceOfferingId(offering.getId());
        List<String> capabilities = requirements.stream()
            .map(ServiceRequirement::getRequirementKey)
            .toList();

        return new ServiceOfferingDto(
            offering.getId(),
            offering.getCode(),
            offering.getName(),
            offering.getDescription(),
            offering.getCategory().name(),
            offering.getBaseDurationMinutes(),
            offering.getBaseDurationMinutes(),
            offering.getSupportsHomeService(),
            offering.getSupportsHomeService(),
            offering.getSupportsWorkshopRepair(),
            offering.getSupportsWorkshopRepair(),
            offering.getSupportsDeviceTransfer(),
            offering.getSupportsDeviceTransfer(),
            new BigDecimal("299.00"),
            offering.getDisplayOrder(),
            capabilities
        );
    }
}
