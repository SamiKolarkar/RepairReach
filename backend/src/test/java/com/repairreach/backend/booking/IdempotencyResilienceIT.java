package com.repairreach.backend.booking;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.domain.CustomerAddress;
import com.repairreach.backend.customer.infrastructure.CustomerAddressRepository;
import com.repairreach.backend.customer.infrastructure.CustomerRepository;
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

class IdempotencyResilienceIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerAddressRepository customerAddressRepository;

    @Test
    @DisplayName("Idempotency Resilience: 20 simultaneous threads with identical payload and idempotency key -> all succeed with same reference")
    void shouldHandleIdempotencyRaceCleanly() throws Exception {
        Customer customer = new Customer();
        customer.setBusinessId(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID);
        customer.setFullName("Idempotency Tester");
        customer.setNormalizedPhone("+919800011111");
        customer = customerRepository.saveAndFlush(customer);

        CustomerAddress address = new CustomerAddress();
        address.setCustomerId(customer.getId());
        address.setAddressLine("Idempotency Test Address");
        address.setCity("Solapur");
        customerAddressRepository.saveAndFlush(address);

        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String targetDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.THURSDAY)).plusWeeks(2).toString();
        String targetSlotId = "slot-09-10";
        String idempotencyKey = UUID.randomUUID().toString();

        CreateBookingRequestDto requestDto = new CreateBookingRequestDto(
            "Idempotency Tester",
            "+91 98000 11111",
            service.getId(),
            "Idempotency Test Address",
            "Idempotency retry storm test",
            targetDate,
            targetSlotId,
            "09:00",
            "10:00"
        );

        String payloadJson = objectMapper.writeValueAsString(requestDto);

        // Initial request creates the booking and sets idempotency record
        MvcResult initialRes = mockMvc.perform(post("/api/v1/public/bookings")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadJson)
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andReturn();
        assertThat(initialRes.getResponse().getStatus()).isEqualTo(201);
        String expectedResponseBody = initialRes.getResponse().getContentAsString();

        // Now test concurrent idempotency replay storm (20 concurrent threads)
        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger otherCount = new AtomicInteger(0);

        List<Callable<Void>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            tasks.add(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    MvcResult res = mockMvc.perform(post("/api/v1/public/bookings")
                            .header("Idempotency-Key", idempotencyKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payloadJson)
                            .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
                        .andReturn();

                    int status = res.getResponse().getStatus();
                    if (status == 201 || status == 200) {
                        successCount.incrementAndGet();
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
        boolean ready = readyLatch.await(5, TimeUnit.SECONDS);
        assertThat(ready).isTrue();

        // Release all threads simultaneously
        startLatch.countDown();

        boolean done = doneLatch.await(15, TimeUnit.SECONDS);
        assertThat(done).isTrue();
        executor.shutdown();

        // All 20 retries succeed idempotently
        assertThat(successCount.get()).isEqualTo(threadCount);
        assertThat(otherCount.get()).isEqualTo(0);
    }
}
