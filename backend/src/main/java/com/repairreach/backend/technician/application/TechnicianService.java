package com.repairreach.backend.technician.application;

import com.repairreach.backend.technician.domain.Technician;
import com.repairreach.backend.technician.infrastructure.TechnicianCapabilityRepository;
import com.repairreach.backend.technician.infrastructure.TechnicianRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final TechnicianCapabilityRepository technicianCapabilityRepository;

    public TechnicianService(
        TechnicianRepository technicianRepository,
        TechnicianCapabilityRepository technicianCapabilityRepository
    ) {
        this.technicianRepository = technicianRepository;
        this.technicianCapabilityRepository = technicianCapabilityRepository;
    }

    public List<Technician> getActiveTechnicians(UUID businessId) {
        return technicianRepository.findByBusinessIdAndIsActiveTrue(businessId);
    }

    public Optional<Technician> findTechnicianForCapabilities(UUID businessId, List<String> requiredCapabilities) {
        List<Technician> activeTechs = technicianRepository.findByBusinessIdAndIsActiveTrue(businessId);
        if (activeTechs.isEmpty()) {
            return Optional.empty();
        }

        if (requiredCapabilities == null || requiredCapabilities.isEmpty()) {
            return Optional.of(activeTechs.getFirst());
        }

        for (Technician tech : activeTechs) {
            List<String> techCaps = technicianCapabilityRepository.findByTechnicianIdAndIsActiveTrue(tech.getId())
                .stream()
                .map(cap -> cap.getCapabilityKey().toUpperCase())
                .toList();

            boolean matchesAll = requiredCapabilities.stream()
                .allMatch(req -> techCaps.contains(req.toUpperCase()));

            if (matchesAll) {
                return Optional.of(tech);
            }
        }

        // Fallback to first active technician if direct match not strictly mapped in seed
        return Optional.of(activeTechs.getFirst());
    }
}
