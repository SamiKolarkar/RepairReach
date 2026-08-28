import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface StepResult {
  scenario: string;
  step: string;
  passed: boolean;
  details: string;
  data?: Record<string, any>;
}

export async function runJourney9Tests() {
  const screenshotsDir = '/home/sami/Desktop/RepairReach/.agents/worker_journey9/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results: StepResult[] = [];
  const networkLogs: { timestamp: string; method: string; url: string; status?: number; error?: string }[] = [];
  const consoleLogs: { timestamp: string; type: string; text: string }[] = [];

  console.log('=== Starting Journey 9: Error Scenario & Resilience Tester ===\n');

  const browser: Browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: 404 Route Handling & Return to Home Navigation
    // -------------------------------------------------------------------------
    console.log('>>> Running Scenario 1: 404 Route Handling <<<');
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'RepairReach-ErrorScenarioTester/1.0'
    });
    const page1: Page = await context1.newPage();

    page1.on('console', (msg) => {
      consoleLogs.push({ timestamp: new Date().toISOString(), type: msg.type(), text: msg.text() });
    });

    const notFoundUrl = 'http://127.0.0.1:5173/nonexistent-route-path-404';
    console.log(`Navigating to ${notFoundUrl}...`);
    const resp1 = await page1.goto(notFoundUrl, { waitUntil: 'networkidle', timeout: 15000 });
    const status1 = resp1?.status() || 0;

    // Verify 404 Page Elements
    const h1Heading = await page1.locator('div.max-w-md h1').textContent();
    const h2Subtitle = await page1.locator('div.max-w-md h2').textContent();
    const descText = await page1.locator('div.max-w-md p').textContent();
    const brokenIcon = await page1.locator('div.max-w-md .material-symbols-outlined').textContent();
    const returnHomeBtn = page1.locator('div.max-w-md button:has-text("Return to Home")');
    const isReturnHomeVisible = await returnHomeBtn.isVisible();

    const scenario1RenderPassed =
      h1Heading?.trim() === '404' &&
      h2Subtitle?.trim() === 'Page Not Found' &&
      (descText?.includes('does not exist or has been moved') ?? false) &&
      brokenIcon?.trim() === 'broken_image' &&
      isReturnHomeVisible;

    results.push({
      scenario: 'Scenario 1: 404 Route Handling',
      step: '1.1 Render 404 Not Found Page',
      passed: scenario1RenderPassed,
      details: `H1: "${h1Heading?.trim()}", H2: "${h2Subtitle?.trim()}", Desc: "${descText?.trim()}", Icon: "${brokenIcon?.trim()}", Return Home Button visible: ${isReturnHomeVisible}`,
      data: {
        url: page1.url(),
        h1: h1Heading?.trim(),
        h2: h2Subtitle?.trim(),
        description: descText?.trim(),
        icon: brokenIcon?.trim(),
        buttonVisible: isReturnHomeVisible
      }
    });

    const screenshotPath1 = path.join(screenshotsDir, '01_404_not_found_page.png');
    await page1.screenshot({ path: screenshotPath1, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath1}`);

    // Click "Return to Home" and verify navigation
    console.log('Clicking "Return to Home" button...');
    await returnHomeBtn.click();
    await page1.waitForURL('http://127.0.0.1:5173/', { timeout: 5000 });

    const homeHeading = await page1.locator('h1').first().textContent();
    const homeCta = await page1.locator('button:has-text("Book a Repair")').isVisible();
    const currentUrl = page1.url();

    const returnedHomePassed =
      currentUrl === 'http://127.0.0.1:5173/' &&
      (homeHeading?.includes('Reliable Appliance Repair') ?? false) &&
      homeCta;

    results.push({
      scenario: 'Scenario 1: 404 Route Handling',
      step: '1.2 Return to Home Navigation',
      passed: returnedHomePassed,
      details: `Target URL: ${currentUrl}, Home Heading: "${homeHeading?.trim()}", Book a Repair button visible: ${homeCta}`,
      data: {
        currentUrl,
        homeHeading: homeHeading?.trim(),
        ctaVisible: homeCta
      }
    });

    const screenshotPath2 = path.join(screenshotsDir, '02_returned_to_homepage.png');
    await page1.screenshot({ path: screenshotPath2, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath2}`);

    await context1.close();

    // -------------------------------------------------------------------------
    // SCENARIO 2A: Services Page under HTTP 500 Backend Failure Simulation
    // -------------------------------------------------------------------------
    console.log('\n>>> Running Scenario 2A: Services Page with HTTP 500 Backend Simulation <<<');
    const context2A = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'RepairReach-ErrorScenarioTester/1.0'
    });
    const isBackendApi = (url: URL) =>
      !url.pathname.includes('/src/') &&
      !url.pathname.endsWith('.ts') &&
      !url.pathname.endsWith('.tsx') &&
      !url.pathname.endsWith('.js') &&
      (url.pathname.includes('/api/') || url.port === '8081');

    const page2A: Page = await context2A.newPage();

    // Intercept backend API requests and respond with HTTP 500 RFC 7807 Problem Details
    await page2A.route(isBackendApi, async (route) => {
      const req = route.request();
      networkLogs.push({
        timestamp: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        status: 500
      });
      console.log(`[Mock Intercept] Failing request 500: ${req.method()} ${req.url()}`);
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Internal Server Error',
          status: 500,
          code: 'DATABASE_UNAVAILABLE',
          detail: 'Database connection pool exhausted during high load simulation.',
          instance: '/api/v1/public/services'
        })
      });
    });

    console.log('Navigating to http://127.0.0.1:5173/services under 500 failure...');
    await page2A.goto('http://127.0.0.1:5173/services', { waitUntil: 'networkidle', timeout: 15000 });

    // Verify UI resilience on /services
    const servicesTitle = await page2A.locator('h1').first().textContent();
    const fallbackTitle = await page2A.locator('h3:has-text("No Services Found")').textContent().catch(() => null);
    const fallbackDesc = await page2A.locator('p:has-text("Our service catalog is currently updating")').textContent().catch(() => null);
    const filterButtons = await page2A.locator('button:has-text("All Services")').isVisible();
    const policyBox = await page2A.locator('text=Standard Visiting & Diagnosis Fee: ₹299').isVisible();

    // Verify application did not crash or blank screen
    const bodyContent = await page2A.locator('#root').innerHTML();
    const appNotCrashed = bodyContent.length > 200 && !bodyContent.includes('Uncaught Exception');

    const scenario2APassed =
      servicesTitle?.includes('Appliance Repair Services') &&
      fallbackTitle?.includes('No Services Found') &&
      filterButtons &&
      policyBox &&
      appNotCrashed;

    results.push({
      scenario: 'Scenario 2: Backend Failure Simulation',
      step: '2A. Services Page Resilience under HTTP 500',
      passed: !!scenario2APassed,
      details: `Page Title: "${servicesTitle?.trim()}", Fallback: "${fallbackTitle?.trim()}", Policy Card Visible: ${policyBox}, App Not Crashed: ${appNotCrashed}`,
      data: {
        pageTitle: servicesTitle?.trim(),
        fallbackTitle: fallbackTitle?.trim(),
        fallbackDesc: fallbackDesc?.trim(),
        filtersVisible: filterButtons,
        policyVisible: policyBox,
        appNotCrashed
      }
    });

    const screenshotPath3 = path.join(screenshotsDir, '03_services_api_500_resilience.png');
    await page2A.screenshot({ path: screenshotPath3, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath3}`);

    await context2A.close();

    // -------------------------------------------------------------------------
    // SCENARIO 2B: Homepage under Network Disconnection / Connection Abort
    // -------------------------------------------------------------------------
    console.log('\n>>> Running Scenario 2B: Homepage with Network Connection Abort <<<');
    const context2B = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'RepairReach-ErrorScenarioTester/1.0'
    });
    const page2B: Page = await context2B.newPage();

    // Abort all backend API network requests
    await page2B.route(isBackendApi, async (route) => {
      const req = route.request();
      networkLogs.push({
        timestamp: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        error: 'connectionrefused'
      });
      console.log(`[Mock Intercept] Aborting request (connectionrefused): ${req.method()} ${req.url()}`);
      await route.abort('connectionrefused');
    });

    console.log('Navigating to http://127.0.0.1:5173/ under aborted network...');
    await page2B.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 15000 });

    const homeHeroTitle = await page2B.locator('h1').first().textContent();
    const trustPillarCount = await page2B.locator('text=Transparent Pricing').count();
    const testimonialsFallback = await page2B.locator('text=Customer feedback and testimonials will appear here once verified').isVisible();
    const skeletonsCount = await page2B.locator('.animate-pulse').count();
    const testimonialsHandled = testimonialsFallback || skeletonsCount > 0;
    const servicesEmptyState = await page2B.locator('text=No Services Found').isVisible();
    const servicesGracefulHandling = skeletonsCount > 0 || servicesEmptyState;
    const bookRepairBtn = await page2B.locator('a[href="/book"] button:has-text("Book a Repair")').isVisible();

    const bodyHome = await page2B.locator('#root').innerHTML();
    const homeNotCrashed = bodyHome.length > 200;

    const scenario2BPassed =
      homeHeroTitle?.includes('Reliable Appliance Repair') &&
      trustPillarCount > 0 &&
      testimonialsHandled &&
      servicesGracefulHandling &&
      bookRepairBtn &&
      homeNotCrashed;

    results.push({
      scenario: 'Scenario 2: Backend Failure Simulation',
      step: '2B. Homepage Resilience under Network Abort',
      passed: !!scenario2BPassed,
      details: `Hero Heading: "${homeHeroTitle?.trim()}", Trust Pillars rendered: ${trustPillarCount > 0}, Testimonials Handled: ${testimonialsHandled}, Services Skeletons/Fallback Handled: ${servicesGracefulHandling} (Skeletons: ${skeletonsCount}, EmptyState: ${servicesEmptyState}), App Not Crashed: ${homeNotCrashed}`,
      data: {
        heroHeading: homeHeroTitle?.trim(),
        trustPillarsRendered: trustPillarCount > 0,
        testimonialsHandled,
        testimonialsFallbackVisible: testimonialsFallback,
        skeletonsCount,
        servicesEmptyStateVisible: servicesEmptyState,
        bookRepairBtnVisible: bookRepairBtn,
        appNotCrashed: homeNotCrashed
      }
    });

    const screenshotPath4 = path.join(screenshotsDir, '04_homepage_network_abort_resilience.png');
    await page2B.screenshot({ path: screenshotPath4, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath4}`);

    await context2B.close();

    // -------------------------------------------------------------------------
    // SCENARIO 2C: Feedback Form Submission Network Failure & Error Alert Banner
    // -------------------------------------------------------------------------
    console.log('\n>>> Running Scenario 2C: Feedback Form Network Failure & Error Alert Banner <<<');
    const context2C = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'RepairReach-ErrorScenarioTester/1.0'
    });
    const page2C: Page = await context2C.newPage();

    // Intercept POST feedback API to return 500 error
    await page2C.route('**/api/v1/public/jobs/**/feedback', async (route) => {
      const req = route.request();
      console.log(`[Mock Intercept] Failing feedback submission: ${req.method()} ${req.url()}`);
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Feedback Submission Failed',
          status: 500,
          code: 'NETWORK_TIMEOUT',
          detail: 'Unable to communicate with the server. Please check your internet connection and try again.'
        })
      });
    });

    const feedbackUrl = 'http://127.0.0.1:5173/feedback?jobReference=RR-20260820-8942&token=fb_token_test_123';
    console.log(`Navigating to ${feedbackUrl}...`);
    await page2C.goto(feedbackUrl, { waitUntil: 'networkidle', timeout: 15000 });

    // Rate 5 stars
    console.log('Selecting 5-star rating...');
    const star5 = page2C.locator('button[aria-label="5 stars"], button:has-text("5")').first();
    if (await star5.isVisible()) {
      await star5.click();
    } else {
      await page2C.locator('.material-symbols-outlined:has-text("star")').last().click();
    }

    // Fill comment
    console.log('Entering feedback comment...');
    await page2C.locator('textarea#feedback-comment').fill('Technician arrived on time and repaired the appliance quickly.');

    // Submit form
    console.log('Submitting feedback form to trigger network failure...');
    await page2C.locator('button[type="submit"]:has-text("Submit Feedback")').click();

    // Wait for error alert banner
    console.log('Waiting for error alert banner...');
    const alertBanner = page2C.locator('[role="alert"]');
    await alertBanner.waitFor({ state: 'visible', timeout: 5000 });

    const alertText = await alertBanner.textContent();
    const alertTitle = await alertBanner.locator('h4').textContent().catch(() => null);
    const isErrorAlertVisible = await alertBanner.isVisible();

    const scenario2CPassed =
      isErrorAlertVisible &&
      (alertTitle?.includes('Feedback Error') ?? false) &&
      (alertText?.includes('Unable to communicate with the server') ?? false);

    results.push({
      scenario: 'Scenario 2: Backend Failure Simulation',
      step: '2C. Feedback Form Error Banner (role="alert")',
      passed: scenario2CPassed,
      details: `Alert Title: "${alertTitle?.trim()}", Alert Text: "${alertText?.trim()}", Alert Role visible: ${isErrorAlertVisible}`,
      data: {
        alertTitle: alertTitle?.trim(),
        alertText: alertText?.trim(),
        isErrorAlertVisible
      }
    });

    const screenshotPath5 = path.join(screenshotsDir, '05_feedback_error_alert_banner.png');
    await page2C.screenshot({ path: screenshotPath5, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath5}`);

    await context2C.close();

    // -------------------------------------------------------------------------
    // SCENARIO 2D: Tracking Page for Nonexistent Booking Reference
    // -------------------------------------------------------------------------
    console.log('\n>>> Running Scenario 2D: Tracking Page with 404 Booking Not Found <<<');
    const context2D = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'RepairReach-ErrorScenarioTester/1.0'
    });
    const page2D: Page = await context2D.newPage();

    // Mock authentication bypass or inject session if protected route
    await page2D.addInitScript(() => {
      const mockSession = {
        access_token: 'fake-jwt-token-for-tracking-test',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'customer@repairreach.solapur'
        }
      };
      localStorage.setItem('sb-mllhxxzjbzfupaolelsz-auth-token', JSON.stringify(mockSession));
    });

    // Intercept booking lookup API and return 404
    await page2D.route('**/api/v1/customer/bookings/RR-NOTFOUND-0000*', async (route) => {
      console.log(`[Mock Intercept] Returning 404 for nonexistent booking reference`);
      await route.fulfill({
        status: 404,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Booking Not Found',
          status: 404,
          code: 'BOOKING_NOT_FOUND',
          detail: 'No booking record exists for reference RR-NOTFOUND-0000'
        })
      });
    });

    const trackingUrl = 'http://127.0.0.1:5173/booking/RR-NOTFOUND-0000';
    console.log(`Navigating to ${trackingUrl}...`);
    await page2D.goto(trackingUrl, { waitUntil: 'networkidle', timeout: 15000 });

    const notFoundHeading = await page2D.locator('h2:has-text("Booking Not Found")').textContent().catch(() => null);
    const searchOffIcon = await page2D.locator('span.material-symbols-outlined:has-text("search_off")').isVisible().catch(() => false);
    const refMention = await page2D.locator('text=RR-NOTFOUND-0000').isVisible().catch(() => false);
    const returnHomeBtn2 = await page2D.locator('a[href="/"] button:has-text("Return Home")').isVisible().catch(() => false);

    const scenario2DPassed =
      notFoundHeading?.includes('Booking Not Found') &&
      searchOffIcon &&
      refMention &&
      returnHomeBtn2;

    results.push({
      scenario: 'Scenario 2: Backend Failure Simulation',
      step: '2D. Tracking Page 404 "Booking Not Found" State',
      passed: !!scenario2DPassed,
      details: `Heading: "${notFoundHeading?.trim()}", Icon search_off visible: ${searchOffIcon}, Ref mentioned: ${refMention}, Return Home button visible: ${returnHomeBtn2}`,
      data: {
        notFoundHeading: notFoundHeading?.trim(),
        searchOffIcon,
        refMention,
        returnHomeBtnVisible: returnHomeBtn2
      }
    });

    const screenshotPath6 = path.join(screenshotsDir, '06_tracking_not_found_error_card.png');
    await page2D.screenshot({ path: screenshotPath6, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath6}`);

    await context2D.close();


  } finally {
    await browser.close();
  }

  console.log('\n=== Test Execution Completed ===');
  console.log(JSON.stringify(results, null, 2));

  return { results, networkLogs, consoleLogs };
}

// Execute directly if run via tsx
runJourney9Tests().catch((err) => {
  console.error('Fatal error executing Journey 9 test script:', err);
  process.exit(1);
});
