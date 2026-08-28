package com.repairreach.backend.shared.domain;

import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();
    public static final UUID DEFAULT_SOLAPUR_BUSINESS_ID = UUID.fromString("00000000-0000-0000-0001-000000000001");

    private TenantContext() {}

    public static void setBusinessId(UUID businessId) {
        CURRENT_TENANT.set(businessId);
    }

    public static UUID getBusinessId() {
        UUID id = CURRENT_TENANT.get();
        return id != null ? id : DEFAULT_SOLAPUR_BUSINESS_ID;
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
