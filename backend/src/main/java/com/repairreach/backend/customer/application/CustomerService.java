package com.repairreach.backend.customer.application;

import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.domain.CustomerAddress;
import com.repairreach.backend.customer.infrastructure.CustomerAddressRepository;
import com.repairreach.backend.customer.infrastructure.CustomerRepository;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class CustomerService {

    private static final Pattern DIGITS_ONLY = Pattern.compile("\\D");
    private final CustomerRepository customerRepository;
    private final CustomerAddressRepository customerAddressRepository;

    public CustomerService(
        CustomerRepository customerRepository,
        CustomerAddressRepository customerAddressRepository
    ) {
        this.customerRepository = customerRepository;
        this.customerAddressRepository = customerAddressRepository;
    }

    public String normalizePhoneNumber(String rawPhone, String fieldName) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new ValidationException(
                "Phone number is required",
                List.of(new InvalidParamDto(fieldName != null ? fieldName : "customerPhone", "Phone number is required", rawPhone))
            );
        }

        String digits = DIGITS_ONLY.matcher(rawPhone).replaceAll("");
        String normalized;

        if (digits.length() == 10) {
            normalized = "+91" + digits;
        } else if (digits.length() == 11 && digits.startsWith("0")) {
            normalized = "+91" + digits.substring(1);
        } else if (digits.length() == 12 && digits.startsWith("91")) {
            normalized = "+" + digits;
        } else {
            throw new ValidationException(
                "Phone number must be a valid 10-digit Indian mobile number",
                List.of(new InvalidParamDto(
                    fieldName != null ? fieldName : "customerPhone",
                    "Phone number must be a valid 10-digit Indian mobile number (e.g. +91 9876543210)",
                    rawPhone
                ))
            );
        }

        // Additional validation: Indian mobile numbers typically start with 6, 7, 8, 9
        char firstMobileDigit = normalized.charAt(3);
        if (firstMobileDigit < '5' || firstMobileDigit > '9') {
            throw new ValidationException(
                "Phone number must be a valid 10-digit Indian mobile number",
                List.of(new InvalidParamDto(
                    fieldName != null ? fieldName : "customerPhone",
                    "Indian mobile numbers must begin with 6, 7, 8, or 9",
                    rawPhone
                ))
            );
        }

        return normalized;
    }

    @Transactional
    public Customer findOrCreateCustomer(
        UUID businessId,
        String authUserId,
        String fullName,
        String rawPhone,
        String phoneFieldName,
        String nameFieldName
    ) {
        List<InvalidParamDto> validationErrors = new ArrayList<>();

        if (fullName == null || fullName.trim().length() < 2) {
            validationErrors.add(new InvalidParamDto(
                nameFieldName != null ? nameFieldName : "customerName",
                "Customer full name must be at least 2 characters long",
                fullName
            ));
        }

        String normalizedPhone = null;
        try {
            normalizedPhone = normalizePhoneNumber(rawPhone, phoneFieldName);
        } catch (ValidationException ex) {
            validationErrors.addAll(ex.getInvalidParams());
        }

        if (!validationErrors.isEmpty()) {
            throw new ValidationException("Customer information is invalid", validationErrors);
        }

        final String finalPhone = normalizedPhone;
        final String finalName = fullName.trim();

        return customerRepository.findByBusinessIdAndNormalizedPhone(businessId, finalPhone)
            .map(existing -> {
                boolean changed = false;
                if (!existing.getFullName().equalsIgnoreCase(finalName)) {
                    existing.setFullName(finalName);
                    changed = true;
                }
                if (authUserId != null && existing.getAuthUserId() == null) {
                    existing.setAuthUserId(authUserId);
                    changed = true;
                }
                if (changed) {
                    return customerRepository.saveAndFlush(existing);
                }
                return existing;
            })
            .orElseGet(() -> {
                Customer newCustomer = new Customer();
                newCustomer.setBusinessId(businessId);
                newCustomer.setNormalizedPhone(finalPhone);
                newCustomer.setFullName(finalName);
                newCustomer.setAuthUserId(authUserId);
                return customerRepository.saveAndFlush(newCustomer);
            });
    }

    @Transactional
    public CustomerAddress findOrCreateAddress(
        Customer customer,
        String addressLine,
        String addressFieldName
    ) {
        if (addressLine == null || addressLine.trim().length() < 5) {
            throw new ValidationException(
                "Service address is required and must be at least 5 characters",
                List.of(new InvalidParamDto(
                    addressFieldName != null ? addressFieldName : "locationAddress",
                    "Address must be at least 5 characters long",
                    addressLine
                ))
            );
        }

        final String cleanAddress = addressLine.trim();

        return customerAddressRepository.findByCustomerId(customer.getId()).stream()
            .filter(addr -> addr.getAddressLine().equalsIgnoreCase(cleanAddress))
            .findFirst()
            .orElseGet(() -> {
                CustomerAddress newAddress = new CustomerAddress();
                newAddress.setCustomerId(customer.getId());
                newAddress.setAddressLine(cleanAddress);
                newAddress.setCity("Solapur");
                newAddress.setDefault(false);
                return customerAddressRepository.saveAndFlush(newAddress);
            });
    }
}
