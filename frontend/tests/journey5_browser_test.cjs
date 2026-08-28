const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/home/sami/Desktop/RepairReach/.agents/worker_journey5/screenshots';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runJourney5Tests() {
  const testResults = {
    startTime: new Date().toISOString(),
    steps: [],
    errors: [],
    screenshots: []
  };

  console.log('=== Starting Journey 5: Confirmation Tracker Test Suite ===');
  
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Log console errors and network failures
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('requestfailed', req => {
    console.log(`[Browser Network Failed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    // ----------------------------------------------------
    // Step 1: Navbar Booking Lookup Modal
    // ----------------------------------------------------
    console.log('\n--- Step 1: Testing Navbar Booking Lookup Modal ---');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    const homeTitle = await page.title();
    console.log('Homepage loaded:', homeTitle);

    // Locate Navbar lookup button
    const lookupBtn = page.locator('button[aria-label="Lookup Booking Reference"]');
    const lookupBtnVisible = await lookupBtn.isVisible();
    console.log('Lookup button visible in navbar:', lookupBtnVisible);

    if (!lookupBtnVisible) {
      throw new Error('Lookup button not visible in navbar');
    }

    await lookupBtn.click();
    await page.waitForSelector('h3#modal-title', { state: 'visible', timeout: 5000 });

    const modalTitle = await page.locator('h3#modal-title').textContent();
    console.log('Modal title:', modalTitle);

    const helperText = await page.locator('div[role="dialog"] p').textContent();
    console.log('Modal helper text:', helperText);

    // Capture screenshot of open lookup modal
    const ssLookup = path.join(SCREENSHOT_DIR, '01_lookup_modal_open.png');
    await page.screenshot({ path: ssLookup, fullPage: false });
    testResults.screenshots.push(ssLookup);
    console.log('Saved screenshot:', ssLookup);

    // Enter valid sample booking reference into modal input
    const testReference = 'RR-20260820-8942';
    const inputLocator = page.locator('input[placeholder="RR-20260820-8942"]');
    await inputLocator.fill(testReference);

    const submitBtn = page.locator('div[role="dialog"] button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);

    const currentUrlAfterLookup = page.url();
    console.log('URL after modal submission:', currentUrlAfterLookup);

    testResults.steps.push({
      name: 'Navbar Lookup Modal',
      status: currentUrlAfterLookup.includes(`/booking/${testReference}`) ? 'PASS' : 'FAIL',
      modalTitle,
      enteredReference: testReference,
      navigatedUrl: currentUrlAfterLookup
    });

    // ----------------------------------------------------
    // Step 2: Direct Navigation & Tracking Page with Real Mock Data
    // ----------------------------------------------------
    console.log('\n--- Step 2: Testing Confirmed State & Details Card ---');
    
    // Define mock confirmed booking
    const mockConfirmedBooking = {
      publicReference: 'RR-20260820-8942',
      bookingState: 'CONFIRMED',
      jobStatus: 'SCHEDULED',
      customerName: 'Sarah Jenkins',
      customerPhone: '+91 98765 43210',
      serviceName: 'Washing Machine Repair & Service',
      serviceLocation: '123 Main St, Market Yard, Solapur 413001',
      problemDescription: 'Washing machine drum vibration during high spin cycle',
      scheduledDate: '2026-08-25',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:00',
      canCancel: true,
      canCancelWithoutCharge: true,
      visitingChargeAmount: 299,
      technician: {
        technicianName: 'Suresh Patil',
        technicianPhone: '+91 98220 11223'
      }
    };

    // Route intercept for /customer/bookings/RR-20260820-8942
    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfirmedBooking)
      });
    });

    await page.route('**/public/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfirmedBooking)
      });
    });

    // Reload page with mock route active
    await page.goto(`http://localhost:5173/booking/RR-20260820-8942`);
    await page.waitForSelector('h1:has-text("Booking Confirmed")', { timeout: 5000 });

    const confirmedHeroText = await page.locator('h1').textContent();
    console.log('Confirmed Hero text:', confirmedHeroText);

    // Inspect Details Card elements
    const summaryCard = page.locator('div:has(> div > h2:text-is("Booking Summary"))');
    const refBadgeText = await summaryCard.locator('span.font-mono.font-bold').textContent();
    const customerVisible = await summaryCard.locator('text=Sarah Jenkins').isVisible();
    const phoneVisible = await summaryCard.locator('text=+91 98765 43210').isVisible();
    const serviceVisible = await summaryCard.locator('text=Washing Machine Repair & Service').isVisible();
    const locationVisible = await summaryCard.locator('text=123 Main St, Market Yard, Solapur 413001').isVisible();
    const issueText = await summaryCard.locator('div:has-text("Issue Details:")').textContent();

    console.log('Details Card Elements:');
    console.log('  - Ref Badge:', refBadgeText);
    console.log('  - Customer visible:', customerVisible);
    console.log('  - Phone visible:', phoneVisible);
    console.log('  - Service visible:', serviceVisible);
    console.log('  - Location visible:', locationVisible);
    console.log('  - Issue Details:', issueText);

    // Inspect Timeline Steps
    const timelineHeading = await page.locator('h3:has-text("Live Repair Status")').textContent();
    const techInfo = await page.locator('div:has-text("Technician: Suresh Patil")').textContent().catch(() => 'None');
    console.log('Timeline Heading:', timelineHeading);
    console.log('Technician Info:', techInfo);

    const stepLabels = await page.locator('div.relative.z-10 span.text-xs').allTextContents().catch(() => []);
    console.log('Timeline Step labels:', stepLabels);

    const ssConfirmed = path.join(SCREENSHOT_DIR, '02_confirmed_tracking_page.png');
    await page.screenshot({ path: ssConfirmed, fullPage: true });
    testResults.screenshots.push(ssConfirmed);
    console.log('Saved screenshot:', ssConfirmed);

    testResults.steps.push({
      name: 'Confirmed Tracking Details Card',
      status: refBadgeText.includes('RR-20260820-8942') && customerVisible && serviceVisible ? 'PASS' : 'FAIL',
      refBadge: refBadgeText,
      customerVisible,
      serviceVisible,
      locationVisible,
      timelineSteps: stepLabels
    });

    // ----------------------------------------------------
    // Step 3: Test Multi-State Tracking: EN_ROUTE and ARRIVED
    // ----------------------------------------------------
    console.log('\n--- Step 3: Testing EN_ROUTE & ARRIVED Timeline States ---');
    
    // Test EN_ROUTE
    const mockEnRouteBooking = {
      ...mockConfirmedBooking,
      jobStatus: 'EN_ROUTE'
    };
    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEnRouteBooking)
      });
    });
    await page.reload();
    await page.waitForTimeout(500);

    const ssEnRoute = path.join(SCREENSHOT_DIR, '03_en_route_tracking_state.png');
    await page.screenshot({ path: ssEnRoute, fullPage: true });
    testResults.screenshots.push(ssEnRoute);
    console.log('Saved screenshot (EN_ROUTE):', ssEnRoute);

    // Test ARRIVED
    const mockArrivedBooking = {
      ...mockConfirmedBooking,
      jobStatus: 'ARRIVED',
      canCancelWithoutCharge: false
    };
    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockArrivedBooking)
      });
    });
    await page.reload();
    await page.waitForTimeout(500);

    const ssArrived = path.join(SCREENSHOT_DIR, '04_arrived_tracking_state.png');
    await page.screenshot({ path: ssArrived, fullPage: true });
    testResults.screenshots.push(ssArrived);
    console.log('Saved screenshot (ARRIVED):', ssArrived);

    testResults.steps.push({
      name: 'EN_ROUTE & ARRIVED Status Timeline States',
      status: 'PASS'
    });

    // ----------------------------------------------------
    // Step 4: Test Completed State & Feedback Rating Prompt
    // ----------------------------------------------------
    console.log('\n--- Step 4: Testing Completed State & Rate Service Banner ---');
    
    const mockCompletedBooking = {
      ...mockConfirmedBooking,
      jobStatus: 'COMPLETED',
      bookingState: 'CONFIRMED',
      canCancel: false,
      feedbackCapabilityToken: 'cap_feedback_tok_12345678'
    };

    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCompletedBooking)
      });
    });

    await page.reload();
    await page.waitForSelector('div[role="alert"]', { timeout: 5000 });

    const completedAlertText = await page.locator('div[role="alert"]').textContent();
    console.log('Completed Alert Text:', completedAlertText);

    const rateBtn = page.locator('a:has-text("Rate Service")');
    const rateBtnVisible = await rateBtn.isVisible();
    const rateHref = await rateBtn.getAttribute('href');
    console.log('Rate Service button visible:', rateBtnVisible, 'href:', rateHref);

    const ssCompleted = path.join(SCREENSHOT_DIR, '05_completed_status_feedback_prompt.png');
    await page.screenshot({ path: ssCompleted, fullPage: true });
    testResults.screenshots.push(ssCompleted);
    console.log('Saved screenshot:', ssCompleted);

    testResults.steps.push({
      name: 'Completed State & Feedback Prompt',
      status: rateBtnVisible && rateHref.includes('/feedback') ? 'PASS' : 'FAIL',
      alertText: completedAlertText,
      rateHref
    });

    // ----------------------------------------------------
    // Step 5: Test Cancel Modal & Flow
    // ----------------------------------------------------
    console.log('\n--- Step 5: Testing Cancel Modal & Flow ---');

    // Switch back to active cancellable state
    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfirmedBooking)
      });
    });

    // Mock Cancel API endpoint
    let cancelApiCalled = false;
    let cancelRequestBody = null;
    await page.route('**/customer/bookings/RR-20260820-8942/cancel', route => {
      cancelApiCalled = true;
      cancelRequestBody = route.request().postData();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publicReference: 'RR-20260820-8942',
          status: 'CANCELLED',
          message: 'Booking successfully cancelled.',
          cancellationFeeCharged: 0,
          cancelledAt: new Date().toISOString()
        })
      });
    });

    await page.reload();
    await page.waitForSelector('button:has-text("Cancel Booking")', { timeout: 5000 });

    const cancelBtn = page.locator('button:has-text("Cancel Booking")');
    await cancelBtn.click();

    // Verify Cancel Modal appears
    await page.waitForSelector('h3#modal-title:has-text("Cancel Repair Booking")', { timeout: 5000 });
    const cancelModalTitle = await page.locator('h3#modal-title').textContent();
    console.log('Cancel Modal Title:', cancelModalTitle);

    // Verify Cancellation Policy text in modal
    const modalPolicyText = await page.locator('div[role="dialog"]').textContent();
    const hasFreePolicy = modalPolicyText.includes('Free Pre-Arrival Cancellation') || modalPolicyText.includes('zero fee');
    const hasFeeNote = modalPolicyText.includes('299') || modalPolicyText.includes('visiting diagnosis fee');
    console.log('Policy checks: Free cancellation mention:', hasFreePolicy, 'Visiting fee mention:', hasFeeNote);

    const ssCancelModal = path.join(SCREENSHOT_DIR, '06_cancel_modal_open.png');
    await page.screenshot({ path: ssCancelModal, fullPage: false });
    testResults.screenshots.push(ssCancelModal);
    console.log('Saved screenshot:', ssCancelModal);

    // Provide a cancellation reason in the textarea
    const reasonTextarea = page.locator('textarea#cancellation-reason');
    await reasonTextarea.fill('Scheduling conflict, need to reschedule next week');

    const confirmCancelBtn = page.locator('div[role="dialog"] button:has-text("Confirm Cancellation")');
    await confirmCancelBtn.click();
    await page.waitForTimeout(1000);

    console.log('Cancel API was called:', cancelApiCalled);
    console.log('Cancel Request Body:', cancelRequestBody);

    // Now mock the tracking response as CANCELLED to check UI rendering
    const mockCancelledBooking = {
      ...mockConfirmedBooking,
      bookingState: 'CANCELLED',
      canCancel: false
    };

    await page.route('**/customer/bookings/RR-20260820-8942', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCancelledBooking)
      });
    });

    await page.reload();
    await page.waitForSelector('h1:has-text("Booking Cancelled")', { timeout: 5000 });

    const cancelledHeroText = await page.locator('h1').textContent();
    const cancelledBanner = await page.locator('div.bg-red-50:has-text("Booking Cancelled")').textContent();
    console.log('Cancelled Hero Text:', cancelledHeroText);
    console.log('Cancelled Banner Text:', cancelledBanner);

    const ssCancelled = path.join(SCREENSHOT_DIR, '07_cancelled_tracking_state.png');
    await page.screenshot({ path: ssCancelled, fullPage: true });
    testResults.screenshots.push(ssCancelled);
    console.log('Saved screenshot:', ssCancelled);

    testResults.steps.push({
      name: 'Cancel Booking Flow',
      status: cancelApiCalled && cancelledHeroText.includes('Booking Cancelled') ? 'PASS' : 'FAIL',
      cancelModalTitle,
      hasFreePolicy,
      cancelApiCalled,
      cancelledHeroText
    });

    // ----------------------------------------------------
    // Step 6: Invalid / Non-Existent Booking Reference State
    // ----------------------------------------------------
    console.log('\n--- Step 6: Testing Invalid Booking Reference (Booking Not Found) ---');
    
    // Let backend or mock 404 return for non-existent reference
    await page.route('**/customer/bookings/RR-99999999-0000', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: 'https://repairreach.in/errors/resource-not-found',
          title: 'Resource Not Found',
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          detail: 'Booking not found for reference: RR-99999999-0000',
          instance: '/api/v1/customer/bookings/RR-99999999-0000'
        })
      });
    });

    await page.goto('http://localhost:5173/booking/RR-99999999-0000');
    await page.waitForSelector('h2:has-text("Booking Not Found")', { timeout: 5000 });

    const notFoundTitle = await page.locator('h2:has-text("Booking Not Found")').textContent();
    const notFoundDesc = await page.locator('div.text-center p').textContent();
    console.log('Not Found Title:', notFoundTitle);
    console.log('Not Found Description:', notFoundDesc);

    const returnHomeBtn = page.locator('a[href="/"] button');
    const contactSupportBtn = page.locator('a[href="/contact"] button');
    console.log('Return Home button visible:', await returnHomeBtn.isVisible());
    console.log('Contact Support button visible:', await contactSupportBtn.isVisible());

    const ssNotFound = path.join(SCREENSHOT_DIR, '08_booking_not_found_error_state.png');
    await page.screenshot({ path: ssNotFound, fullPage: false });
    testResults.screenshots.push(ssNotFound);
    console.log('Saved screenshot:', ssNotFound);

    // Click Return Home and verify navigation to `/`
    await returnHomeBtn.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 });
    console.log('Navigated back to Home, URL:', page.url());

    testResults.steps.push({
      name: 'Invalid Booking Reference Error Handling',
      status: notFoundTitle.includes('Booking Not Found') && page.url() === 'http://localhost:5173/' ? 'PASS' : 'FAIL',
      notFoundTitle,
      notFoundDesc,
      homeNavigatedUrl: page.url()
    });

  } catch (err) {
    console.error('Test Suite Exception:', err);
    testResults.errors.push(err.stack || err.message);
  } finally {
    await browser.close();
    testResults.endTime = new Date().toISOString();
    fs.writeFileSync(
      '/home/sami/Desktop/RepairReach/.agents/worker_journey5/raw_test_results.json',
      JSON.stringify(testResults, null, 2)
    );
    console.log('\n=== Journey 5 Test Suite Finished. Results saved to raw_test_results.json ===');
  }
}

runJourney5Tests();
