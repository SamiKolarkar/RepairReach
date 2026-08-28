package com.repairreach.backend.customer;

import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.web.CustomerBookingController;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.customer.application.CustomerOtpService;
import com.repairreach.backend.customer.application.CustomerService;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.infrastructure.CustomerAddressRepository;
import com.repairreach.backend.customer.infrastructure.CustomerRepository;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.security.JwtCapabilityTokenService;
import jakarta.persistence.Column;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdversarialCustomerLazyLinkingTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CustomerAddressRepository customerAddressRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private JwtCapabilityTokenService jwtCapabilityTokenService;

    private CustomerService customerService;
    private CustomerOtpService customerOtpService;
    private CustomerBookingController customerBookingController;

    private final UUID defaultBusinessId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        customerService = new CustomerService(customerRepository, customerAddressRepository);
        customerOtpService = new CustomerOtpService(customerService, customerRepository, jwtCapabilityTokenService);
        customerBookingController = new CustomerBookingController(bookingService);
        TenantContext.setBusinessId(defaultBusinessId);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Nested
    @DisplayName("1. Non-UUID Firebase UID Invariant Tests")
    class NonUuidFirebaseUidTests {

        @ParameterizedTest(name = "Should support non-UUID Firebase UID: {0}")
        @ValueSource(strings = {
            "pL4x9ZbqW8Y1Nm2K3wErTyUiOpA1",                       // 28-char typical Firebase UID
            "1A2b3C4d5E6F7g8H9I0JkLmNoPqR",                       // 28-char mixed case
            "user_firebase_uid_under_score_12345",                // Underscores
            "firebase-uid-with-hyphens-99999",                    // Hyphens
            "AIzaSyB3k8XyZ_FirebaseCustomAuthTokenUid",           // Custom auth token UID format
            "a",                                                   // 1-char short UID
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" // 128-char maximum length
        })
        void shouldCreateNewCustomerWithDiverseNonUuidFirebaseUids(String firebaseUid) {
            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.empty());

            when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> {
                Customer c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            Customer created = customerService.findOrCreateCustomer(
                defaultBusinessId,
                firebaseUid,
                "Rohit Sharma",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(created).isNotNull();
            assertThat(created.getAuthUserId()).isEqualTo(firebaseUid);
            assertThat(created.getFullName()).isEqualTo("Rohit Sharma");
            assertThat(created.getNormalizedPhone()).isEqualTo("+919876543210");

            ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
            verify(customerRepository).saveAndFlush(captor.capture());
            assertThat(captor.getValue().getAuthUserId()).isEqualTo(firebaseUid);
        }

        @Test
        @DisplayName("Customer entity reflection confirms VARCHAR(128) and unique constraint annotations")
        void verifyCustomerEntityMetadataConstraints() throws NoSuchFieldException, NoSuchMethodException {
            Field authUserIdField = Customer.class.getDeclaredField("authUserId");
            assertThat(authUserIdField.getType()).isEqualTo(String.class);

            Column columnAnnotation = authUserIdField.getAnnotation(Column.class);
            assertThat(columnAnnotation).isNotNull();
            assertThat(columnAnnotation.name()).isEqualTo("auth_user_id");
            assertThat(columnAnnotation.unique()).isTrue();
            assertThat(columnAnnotation.length()).isEqualTo(128);

            Method getAuthUserId = Customer.class.getMethod("getAuthUserId");
            assertThat(getAuthUserId.getReturnType()).isEqualTo(String.class);

            Method setAuthUserId = Customer.class.getMethod("setAuthUserId", String.class);
            assertThat(setAuthUserId.getParameterTypes()[0]).isEqualTo(String.class);
        }
    }

    @Nested
    @DisplayName("2. Null auth_user_id (Anonymous / Public / OTP Flows) Tests")
    class NullAuthUserIdTests {

        @Test
        @DisplayName("Should create customer with null auth_user_id for unauthenticated/guest booking")
        void shouldCreateCustomerWithNullAuthUserId() {
            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.empty());

            when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> {
                Customer c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            Customer created = customerService.findOrCreateCustomer(
                defaultBusinessId,
                null,
                "Amitabh Bachchan",
                "+91 9876543210",
                "customerPhone",
                "customerName"
            );

            assertThat(created).isNotNull();
            assertThat(created.getAuthUserId()).isNull();
            assertThat(created.getFullName()).isEqualTo("Amitabh Bachchan");
            assertThat(created.getNormalizedPhone()).isEqualTo("+919876543210");
        }

        @Test
        @DisplayName("CustomerOtpService should pass null authUserId and successfully link/create customer")
        void shouldHandleCustomerOtpVerificationWithNullAuthUserId() {
            // Seed OTP via sendOtp
            customerOtpService.sendOtp("+919876543210");

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.empty());

            when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> {
                Customer c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            when(jwtCapabilityTokenService.createCapabilityToken(any(), any(), any(), any(), anyLong()))
                .thenReturn("mock-jwt-capability-token");

            var response = customerOtpService.verifyOtp("+919876543210", "123456", "Valued User");

            assertThat(response).isNotNull();
            assertThat(response.token()).isEqualTo("mock-jwt-capability-token");
            assertThat(response.customer().fullName()).isEqualTo("Valued User");

            ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
            verify(customerRepository).saveAndFlush(captor.capture());
            assertThat(captor.getValue().getAuthUserId()).isNull();
        }
    }

    @Nested
    @DisplayName("3. Lazy Linking Transitions Tests")
    class LazyLinkingTransitionTests {

        @Test
        @DisplayName("Transition 1: Existing customer with null auth_user_id lazily links Firebase UID on booking")
        void shouldLazilyLinkFirebaseUidWhenExistingCustomerHasNullUid() {
            Customer existingGuestCustomer = new Customer();
            existingGuestCustomer.setId(UUID.randomUUID());
            existingGuestCustomer.setBusinessId(defaultBusinessId);
            existingGuestCustomer.setFullName("Sachin Tendulkar");
            existingGuestCustomer.setNormalizedPhone("+919876543210");
            existingGuestCustomer.setAuthUserId(null); // previously unlinked

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.of(existingGuestCustomer));

            when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

            String incomingFirebaseUid = "firebase_uid_sachin_10";
            Customer result = customerService.findOrCreateCustomer(
                defaultBusinessId,
                incomingFirebaseUid,
                "Sachin Tendulkar",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(result.getAuthUserId()).isEqualTo(incomingFirebaseUid);
            verify(customerRepository, times(1)).saveAndFlush(existingGuestCustomer);
        }

        @Test
        @DisplayName("Transition 2: Existing customer already has same Firebase UID -> no modification or extra flush")
        void shouldNotReSaveWhenExistingCustomerHasIdenticalUidAndName() {
            String firebaseUid = "firebase_uid_virat_18";
            Customer existingCustomer = new Customer();
            existingCustomer.setId(UUID.randomUUID());
            existingCustomer.setBusinessId(defaultBusinessId);
            existingCustomer.setFullName("Virat Kohli");
            existingCustomer.setNormalizedPhone("+919876543210");
            existingCustomer.setAuthUserId(firebaseUid);

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.of(existingCustomer));

            Customer result = customerService.findOrCreateCustomer(
                defaultBusinessId,
                firebaseUid,
                "Virat Kohli",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(result.getAuthUserId()).isEqualTo(firebaseUid);
            // No changes needed, saveAndFlush shouldn't be called
            verify(customerRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Transition 3: Existing linked customer booking with null authUserId retains existing Firebase UID")
        void shouldPreserveExistingUidWhenSubsequentBookingPassesNull() {
            String existingUid = "firebase_uid_dhoni_07";
            Customer existingCustomer = new Customer();
            existingCustomer.setId(UUID.randomUUID());
            existingCustomer.setBusinessId(defaultBusinessId);
            existingCustomer.setFullName("MS Dhoni");
            existingCustomer.setNormalizedPhone("+919876543210");
            existingCustomer.setAuthUserId(existingUid);

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.of(existingCustomer));

            Customer result = customerService.findOrCreateCustomer(
                defaultBusinessId,
                null, // Anonymous booking attempt on known number
                "MS Dhoni",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(result.getAuthUserId()).isEqualTo(existingUid);
            verify(customerRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Transition 4: Existing linked customer booking with different UID preserves original UID (prevents account takeover)")
        void shouldPreserveOriginalUidWhenDifferentUidAttempted() {
            String originalUid = "firebase_uid_original_owner";
            String attackerUid = "firebase_uid_different_user";

            Customer existingCustomer = new Customer();
            existingCustomer.setId(UUID.randomUUID());
            existingCustomer.setBusinessId(defaultBusinessId);
            existingCustomer.setFullName("Original Owner");
            existingCustomer.setNormalizedPhone("+919876543210");
            existingCustomer.setAuthUserId(originalUid);

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.of(existingCustomer));

            Customer result = customerService.findOrCreateCustomer(
                defaultBusinessId,
                attackerUid,
                "Original Owner",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(result.getAuthUserId()).isEqualTo(originalUid);
            verify(customerRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Transition 5: Update customer name during lazy linking if name changed")
        void shouldUpdateCustomerNameIfChangedDuringLazyLinking() {
            Customer existingCustomer = new Customer();
            existingCustomer.setId(UUID.randomUUID());
            existingCustomer.setBusinessId(defaultBusinessId);
            existingCustomer.setFullName("Old Name");
            existingCustomer.setNormalizedPhone("+919876543210");
            existingCustomer.setAuthUserId(null);

            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.of(existingCustomer));

            when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

            Customer result = customerService.findOrCreateCustomer(
                defaultBusinessId,
                "new_firebase_uid",
                "Updated New Name",
                "+91 9876543210",
                "phone",
                "name"
            );

            assertThat(result.getFullName()).isEqualTo("Updated New Name");
            assertThat(result.getAuthUserId()).isEqualTo("new_firebase_uid");
            verify(customerRepository).saveAndFlush(existingCustomer);
        }
    }

    @Nested
    @DisplayName("4. Customer Uniqueness & Duplicate Rejection Tests")
    class UniquenessAndDuplicateTests {

        @Test
        @DisplayName("Should propagate DataIntegrityViolationException on duplicate auth_user_id collision across phone numbers")
        void shouldThrowDataIntegrityViolationOnDuplicateAuthUserId() {
            when(customerRepository.findByBusinessIdAndNormalizedPhone(eq(defaultBusinessId), eq("+919876543210")))
                .thenReturn(Optional.empty());

            when(customerRepository.saveAndFlush(any(Customer.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"customer_auth_user_id_key\""));

            assertThatThrownBy(() -> customerService.findOrCreateCustomer(
                defaultBusinessId,
                "already_used_firebase_uid",
                "Second User",
                "+91 9876543210",
                "phone",
                "name"
            ))
            .isInstanceOf(DataIntegrityViolationException.class)
            .hasMessageContaining("customer_auth_user_id_key");
        }

        @Test
        @DisplayName("Should reject invalid phone numbers and invalid names with ValidationException")
        void shouldRejectInvalidInputs() {
            // Invalid phone: 8 digits
            assertThatThrownBy(() -> customerService.findOrCreateCustomer(
                defaultBusinessId,
                "uid-123",
                "Valid Name",
                "987654",
                "phone",
                "name"
            ))
            .isInstanceOf(ValidationException.class);

            // Invalid phone: doesn't start with 6,7,8,9
            assertThatThrownBy(() -> customerService.findOrCreateCustomer(
                defaultBusinessId,
                "uid-123",
                "Valid Name",
                "+91 1234567890",
                "phone",
                "name"
            ))
            .isInstanceOf(ValidationException.class);

            // Invalid name: < 2 chars
            assertThatThrownBy(() -> customerService.findOrCreateCustomer(
                defaultBusinessId,
                "uid-123",
                "A",
                "+91 9876543210",
                "phone",
                "name"
            ))
            .isInstanceOf(ValidationException.class);
        }
    }

    @Nested
    @DisplayName("5. Customer Booking Controller UID Propagation Tests")
    class ControllerUidPropagationTests {

        @Test
        @DisplayName("CustomerBookingController should extract String UID from JWT subject and pass to BookingService")
        void shouldExtractStringSubjectAndPassToBookingService() {
            String firebaseUid = "firebase_user_abc_789_xyz";
            Jwt jwt = mock(Jwt.class);
            when(jwt.getSubject()).thenReturn(firebaseUid);

            CreateBookingRequestDto request = new CreateBookingRequestDto(
                "Pooja Hegde",
                "+91 9876543210",
                UUID.randomUUID(),
                "45 Station Road, Solapur",
                "Washing machine drain issue",
                "2026-08-25",
                "slot-14-15",
                "14:00",
                "15:00"
            );

            BookingConfirmationResponseDto mockConfirmation = mock(BookingConfirmationResponseDto.class);
            when(mockConfirmation.publicReference()).thenReturn("RR-260825-XYZ999");

            when(bookingService.createBooking(eq(request), eq("idemp-k1"), eq(firebaseUid)))
                .thenReturn(mockConfirmation);

            ResponseEntity<BookingConfirmationResponseDto> response = customerBookingController.createBooking(
                request,
                "idemp-k1",
                jwt
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().publicReference()).isEqualTo("RR-260825-XYZ999");
            verify(bookingService).createBooking(request, "idemp-k1", firebaseUid);
        }
    }
}
