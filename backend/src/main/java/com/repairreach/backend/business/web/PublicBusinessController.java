package com.repairreach.backend.business.web;

import com.repairreach.backend.business.application.BusinessService;
import com.repairreach.backend.business.web.dto.BusinessProfileDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/business")
public class PublicBusinessController {

    private final BusinessService businessService;

    public PublicBusinessController(BusinessService businessService) {
        this.businessService = businessService;
    }

    @GetMapping
    public ResponseEntity<BusinessProfileDto> getBusinessProfile() {
        BusinessProfileDto profile = businessService.getBusinessProfile();
        return ResponseEntity.ok(profile);
    }
}
