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
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class BookingConcurrencyIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("Adversarial Concurrency: 2 simultaneous threads booking identical slot -> exactly 1 HTTP 201, exactly 1 HTTP 409 SLOT_UNAVAILABLE")
    void shouldHandleConcurrentBookingRaceCleanly() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String targetDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.TUESDAY)).plusWeeks(1).toString();
        String targetSlotId = "slot-10-11";

        CreateBookingRequestDto requestCustomerA = new CreateBookingRequestDto(
            "Customer Alpha",
            "+91 98111 22334",
            service.getId(),
            "100 Navi Peth, Solapur",
            "Drum issue",
            targetDate,
            targetSlotId,
            "10:00",
            "11:00"
        );

        CreateBookingRequestDto requestCustomerB = new CreateBookingRequestDto(
            "Customer Beta",
            "+91 98555 66778",
            service.getId(),
            "200 Saat Rasta, Solapur",
            "Filter leak",
            targetDate,
            targetSlotId,
            "10:00",
            "11:00"
        );

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        AtomicInteger otherCount = new AtomicInteger(0);

        Callable<Void> taskA = () -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                MvcResult res = mockMvc.perform(post("/api/v1/public/bookings")
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestCustomerA))
                        .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
                    .andReturn();

                int status = res.getResponse().getStatus();
                if (status == 201) {
                    successCount.incrementAndGet();
                } else if (status == 409) {
                    conflictCount.incrementAndGet();
                } else {
                    otherCount.incrementAndGet();
                }
            } catch (Exception e) {
                otherCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
            return null;
        };

        Callable<Void> taskB = () -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                MvcResult res = mockMvc.perform(post("/api/v1/public/bookings")
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestCustomerB))
                        .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
                    .andReturn();

                int status = res.getResponse().getStatus();
                if (status == 201) {
                    successCount.incrementAndGet();
                } else if (status == 409) {
                    conflictCount.incrementAndGet();
                } else {
                    otherCount.incrementAndGet();
                }
            } catch (Exception e) {
                otherCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
            return null;
        };

        executor.submit(taskA);
        executor.submit(taskB);

        // Wait until both threads are prepared
        boolean ready = readyLatch.await(5, TimeUnit.SECONDS);
        assertThat(ready).isTrue();

        // Release both threads simultaneously to create absolute race condition
        startLatch.countDown();

        boolean done = doneLatch.await(10, TimeUnit.SECONDS);
        assertThat(done).isTrue();
        executor.shutdown();

        // Exactly 1 winner and 1 conflict
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);
        assertThat(otherCount.get()).isEqualTo(0);
    }
}
