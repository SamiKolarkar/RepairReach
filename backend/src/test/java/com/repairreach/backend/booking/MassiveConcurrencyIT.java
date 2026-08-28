package com.repairreach.backend.booking;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.shared.domain.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class MassiveConcurrencyIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("Massive Concurrency: 100 simultaneous threads booking identical slot -> exactly 1 HTTP 201, exactly 99 HTTP 409 SLOT_UNAVAILABLE")
    void shouldHandleMassiveConcurrentBookingRaceCleanly() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String targetDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY)).plusWeeks(2).toString();
        String targetSlotId = "slot-10-11";

        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        AtomicInteger otherCount = new AtomicInteger(0);

        List<Callable<Void>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final int customerId = i;
            CreateBookingRequestDto requestDto = new CreateBookingRequestDto(
                "Customer " + customerId,
                "+91 98000 000" + String.format("%02d", customerId % 100),
                service.getId(),
                "Address " + customerId,
                "Massive concurrency test",
                targetDate,
                targetSlotId,
                "10:00",
                "11:00"
            );

            tasks.add(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    MvcResult res = mockMvc.perform(post("/api/v1/public/bookings")
                            .header("Idempotency-Key", UUID.randomUUID().toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestDto))
                            .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
                        .andReturn();

                    int status = res.getResponse().getStatus();
                    if (status == 201) {
                        successCount.incrementAndGet();
                    } else if (status == 409) {
                        conflictCount.incrementAndGet();
                    } else {
                        otherCount.incrementAndGet();
                        System.err.println("Unexpected status: " + status + ", body: " + res.getResponse().getContentAsString());
                    }
                } catch (Exception e) {
                    otherCount.incrementAndGet();
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
                return null;
            });
        }

        for (Callable<Void> task : tasks) {
            executor.submit(task);
        }

        // Wait until all threads are prepared
        boolean ready = readyLatch.await(10, TimeUnit.SECONDS);
        assertThat(ready).isTrue();

        // Release all threads simultaneously
        startLatch.countDown();

        boolean done = doneLatch.await(30, TimeUnit.SECONDS);
        assertThat(done).isTrue();
        executor.shutdown();

        // Exactly 1 winner and 99 conflicts
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(threadCount - 1);
        assertThat(otherCount.get()).isEqualTo(0);
    }
}
