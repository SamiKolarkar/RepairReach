package com.repairreach.backend.catalog.web;

import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.web.dto.ServiceOfferingDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/services")
public class PublicCatalogController {

    private final CatalogService catalogService;

    public PublicCatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceOfferingDto>> getPublishedServices() {
        List<ServiceOfferingDto> services = catalogService.getPublishedServices();
        return ResponseEntity.ok(services);
    }
}
