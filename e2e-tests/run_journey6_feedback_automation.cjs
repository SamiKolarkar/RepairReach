/**
 * Journey 6: Feedback Submitter - Comprehensive Playwright Browser Automation Suite
 * Tests live UI at http://localhost:5173/feedback with backend at http://localhost:8081
 */

const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('/home/sami/Desktop/RepairReach/.agents/worker_journey6/screenshots');
const BASE_URL = 'http://localhost:5173';

const results = {
  journey: 'Journey 6 — Feedback Submitter',
  targetUrl: `${BASE_URL}/feedback`,
  timestamp: new Date().toISOString(),
  steps: [],
  networkRequests: [],
  networkResponses: [],
  passed: true,
  summary: '',
};

function logStep(name, status, details = {}) {
  const step = { name, status, timestamp: new Date().toISOString(), details };
  results.steps.push(step);
  console.log(`[${status ? 'PASS' : 'FAIL'}] ${name}`);
  if (details && Object.keys(details).length > 0) {
    console.log(`  Details:`, JSON.stringify(details, null, 2));
  }
}

async function runFeedbackJourney() {
  console.log('================================================================');
  console.log('Starting Journey 6 — Feedback Submitter Browser Automation');
  console.log('Target URL:', BASE_URL + '/feedback');
  console.log('Screenshot Directory:', SCREENSHOT_DIR);
  console.log('================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Monitor network traffic
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      const record = {
        method: req.method(),
        url: req.url(),
        headers: req.headers(),
        postData: req.postData(),
        timestamp: new Date().toISOString(),
      };
      results.networkRequests.push(record);
      console.log(`-> HTTP ${record.method} ${record.url}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch (e) {
        bodyText = `<binary or unreadable: ${e.message}>`;
      }
      const record = {
        status: res.status(),
        statusText: res.statusText(),
        url: res.url(),
        headers: res.headers(),
        body: bodyText,
        timestamp: new Date().toISOString(),
      };
      results.networkResponses.push(record);
      console.log(`<- HTTP ${record.status} ${record.url}`);
    }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Initial Page Inspection on /feedback
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Navigating to /feedback (initial load) ---');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle' });

    const pageTitle = await page.title();
    const headingText = await page.locator('h1').innerText();
    const subtitleText = await page.locator('p.font-body-lg').innerText();

    // Check Star Rating buttons
    const starButtons = await page.locator('button[role="radio"]').all();
    const starLabels = [];
    for (const btn of starButtons) {
      starLabels.push(await btn.getAttribute('aria-label'));
    }

    // Check Comment textarea
    const textareaExists = await page.locator('textarea#feedback-comment').isVisible();
    const textareaPlaceholder = await page.locator('textarea#feedback-comment').getAttribute('placeholder');

    // Check Buttons
    const submitBtn = page.locator('button[type="submit"]');
    const submitBtnText = await submitBtn.innerText();
    const skipBtn = page.locator('button:has-text("Skip")');
    const skipBtnVisible = await skipBtn.isVisible();

    const screenshot1 = path.join(SCREENSHOT_DIR, '01_feedback_initial_load.png');
    await page.screenshot({ path: screenshot1, fullPage: true });

    const step1Pass =
      headingText.includes('Rate Your Experience') &&
      starButtons.length === 5 &&
      textareaExists &&
      submitBtnText.includes('Submit Feedback') &&
      skipBtnVisible;

    logStep('1. Initial /feedback Page Layout & Element Verification', step1Pass, {
      pageTitle,
      headingText,
      subtitleText,
      starRatingCount: starButtons.length,
      starLabels,
      textareaExists,
      textareaPlaceholder,
      submitBtnText: submitBtnText.trim(),
      skipBtnVisible,
      screenshot: screenshot1,
    });

    // -------------------------------------------------------------------------
    // TEST 2: Validation Test (0 Stars Selected)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Testing 0-Star Validation Error Handling ---');
    // Ensure 0 stars selected, click submit
    await submitBtn.click();
    await page.waitForTimeout(500);

    const alertMsgLocator = page.locator('p[role="alert"]');
    const isAlertVisible = await alertMsgLocator.isVisible();
    let alertMsgText = '';
    if (isAlertVisible) {
      alertMsgText = await alertMsgLocator.innerText();
    }

    const screenshot2 = path.join(SCREENSHOT_DIR, '02_feedback_validation_zero_stars.png');
    await page.screenshot({ path: screenshot2, fullPage: true });

    const step2Pass = isAlertVisible && alertMsgText.length > 0;
    logStep('2. Validation Error Handling for 0 Stars', step2Pass, {
      isAlertVisible,
      alertMsgText: alertMsgText.trim(),
      screenshot: screenshot2,
    });

    // -------------------------------------------------------------------------
    // TEST 3: Interactive Star Selection & Comment Input
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Testing Interactive Star Selection & Comment Typing ---');
    // Click 1 star
    await page.locator('button[aria-label="Rate 1 star"]').click();
    await page.waitForTimeout(200);
    const star1Checked = await page.locator('button[aria-label="Rate 1 star"]').getAttribute('aria-checked');

    // Click 3 stars
    await page.locator('button[aria-label="Rate 3 stars"]').click();
    await page.waitForTimeout(200);
    const star3Checked = await page.locator('button[aria-label="Rate 3 stars"]').getAttribute('aria-checked');

    // Click 5 stars
    await page.locator('button[aria-label="Rate 5 stars"]').click();
    await page.waitForTimeout(200);
    const star5Checked = await page.locator('button[aria-label="Rate 5 stars"]').getAttribute('aria-checked');

    // Enter comment
    const commentText = 'Prompt and professional repair technician. Arrived on time in Solapur and fixed the washing machine quickly.';
    await page.locator('textarea#feedback-comment').fill(commentText);
    const enteredComment = await page.locator('textarea#feedback-comment').inputValue();

    // Verify error cleared
    const alertStillVisible = await alertMsgLocator.isVisible();

    const screenshot3 = path.join(SCREENSHOT_DIR, '03_feedback_interactive_5stars_comment.png');
    await page.screenshot({ path: screenshot3, fullPage: true });

    const step3Pass =
      star5Checked === 'true' &&
      enteredComment === commentText &&
      !alertStillVisible;

    logStep('3. Interactive Star Selection & Comment Input', step3Pass, {
      star1Checked,
      star3Checked,
      star5Checked,
      enteredComment,
      alertCleared: !alertStillVisible,
      screenshot: screenshot3,
    });

    // -------------------------------------------------------------------------
    // TEST 4: Negative Test - Submitting with Invalid Job / Token
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Testing Negative Scenario (Invalid Job / Token Error Handling) ---');
    await page.goto(`${BASE_URL}/feedback?jobReference=RR-INVALID-9999&token=bad-token`, { waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Rate 4 stars"]').click();
    await page.locator('textarea#feedback-comment').fill('Attempting feedback submission for nonexistent job');
    
    // Submit
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const errorAlert = page.locator('div[role="alert"], .bg-red-50, .border-red-200');
    const isErrorVisible = await errorAlert.first().isVisible();
    let errorAlertText = '';
    if (isErrorVisible) {
      errorAlertText = await errorAlert.first().innerText();
    }

    const screenshot4 = path.join(SCREENSHOT_DIR, '04_feedback_server_error_alert.png');
    await page.screenshot({ path: screenshot4, fullPage: true });

    logStep('4. Server Error Alert on Invalid Job / Token', isErrorVisible, {
      isErrorVisible,
      errorAlertText: errorAlertText.replace(/\n+/g, ' ').trim(),
      screenshot: screenshot4,
    });

    // -------------------------------------------------------------------------
    // TEST 5: End-to-End Feedback Submission with Real Job & Token
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Testing End-to-End Submission with Valid Job RR-20260820-8942 ---');
    await page.goto(`${BASE_URL}/feedback?jobReference=RR-20260820-8942&token=mock-token`, { waitUntil: 'networkidle' });

    // Select 5 stars
    await page.locator('button[aria-label="Rate 5 stars"]').click();
    await page.waitForTimeout(200);

    // Type genuine comment
    const genuineComment = 'Prompt and professional repair technician. Excellent washing machine service in Solapur!';
    await page.locator('textarea#feedback-comment').fill(genuineComment);

    const requestsBefore = results.networkRequests.length;
    // Click Submit Feedback
    await page.locator('button[type="submit"]').click();
    
    // Wait for submission response and UI transition
    await page.waitForSelector('h2:has-text("Thank You!")', { timeout: 8000 });
    await page.waitForTimeout(500);

    const thankYouHeading = await page.locator('h2').innerText();
    const thankYouBody = await page.locator('p.font-body-lg').innerText();
    const googleCardHeading = await page.locator('h3:has-text("Share on Google Reviews")').innerText();
    const googleReviewBtn = page.locator('a:has-text("Review us on Google")');
    const googleReviewHref = await googleReviewBtn.getAttribute('href');
    const returnHomeBtn = page.locator('button:has-text("Return to Home")');
    const returnHomeVisible = await returnHomeBtn.isVisible();

    const screenshot5 = path.join(SCREENSHOT_DIR, '05_feedback_success_confirmation.png');
    await page.screenshot({ path: screenshot5, fullPage: true });

    // Find the feedback network request and response
    const feedbackReq = results.networkRequests.find((r) => r.url.includes('/feedback'));
    const feedbackRes = results.networkResponses.find((r) => r.url.includes('/feedback'));

    const step5Pass =
      thankYouHeading.includes('Thank You!') &&
      googleCardHeading.includes('Share on Google Reviews') &&
      returnHomeVisible &&
      feedbackRes &&
      feedbackRes.status === 201;

    logStep('5. Genuine Feedback Submission & Confirmation Screen', step5Pass, {
      thankYouHeading,
      thankYouBody,
      googleCardHeading,
      googleReviewHref,
      returnHomeVisible,
      networkRequest: feedbackReq
        ? {
            method: feedbackReq.method,
            url: feedbackReq.url,
            headers: {
              'x-feedback-token': feedbackReq.headers['x-feedback-token'],
              'idempotency-key': feedbackReq.headers['idempotency-key'],
            },
            payload: feedbackReq.postData,
          }
        : null,
      networkResponse: feedbackRes
        ? {
            status: feedbackRes.status,
            body: feedbackRes.body,
          }
        : null,
      screenshot: screenshot5,
    });

    // -------------------------------------------------------------------------
    // TEST 6: Navigation - Return to Home
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Testing "Return to Home" Action ---');
    await returnHomeBtn.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 });
    const homeH1 = await page.locator('h1').innerText();

    const screenshot6 = path.join(SCREENSHOT_DIR, '06_feedback_return_to_home.png');
    await page.screenshot({ path: screenshot6, fullPage: true });

    const step6Pass = page.url() === `${BASE_URL}/` && homeH1.includes('Reliable Appliance Repair');
    logStep('6. "Return to Home" Navigation from Confirmation Screen', step6Pass, {
      currentUrl: page.url(),
      homeH1,
      screenshot: screenshot6,
    });

    // -------------------------------------------------------------------------
    // TEST 7: Skip Button Navigation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Testing "Skip" Button Navigation ---');
    await page.goto(`${BASE_URL}/feedback`, { waitUntil: 'networkidle' });
    await page.locator('button:has-text("Skip")').click();
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 });

    const screenshot7 = path.join(SCREENSHOT_DIR, '07_feedback_skip_navigation.png');
    await page.screenshot({ path: screenshot7, fullPage: true });

    const step7Pass = page.url() === `${BASE_URL}/`;
    logStep('7. "Skip" Button Navigation to Home', step7Pass, {
      currentUrl: page.url(),
      screenshot: screenshot7,
    });

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate Feedback Submission (Immutability Enforcement)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Testing Duplicate Submission Rejection (Immutability) ---');
    await page.goto(`${BASE_URL}/feedback?jobReference=RR-20260820-8942&token=mock-token`, { waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Rate 5 stars"]').click();
    await page.locator('textarea#feedback-comment').fill('Second feedback attempt should be rejected.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const dupErrorAlert = page.locator('div[role="alert"], .bg-red-50, .border-red-200');
    const isDupErrorVisible = await dupErrorAlert.first().isVisible();
    let dupErrorText = '';
    if (isDupErrorVisible) {
      dupErrorText = await dupErrorAlert.first().innerText();
    }

    const screenshot8 = path.join(SCREENSHOT_DIR, '08_feedback_duplicate_rejection.png');
    await page.screenshot({ path: screenshot8, fullPage: true });

    const dupRes = results.networkResponses.find((r) => r.status === 409);

    const step8Pass =
      isDupErrorVisible &&
      (dupErrorText.includes('already been submitted') || dupErrorText.includes('cannot be modified'));

    logStep('8. Immutability & Duplicate Feedback Rejection (HTTP 409)', step8Pass, {
      isDupErrorVisible,
      dupErrorText: dupErrorText.replace(/\n+/g, ' ').trim(),
      httpStatus: dupRes ? dupRes.status : 'N/A',
      responseBody: dupRes ? dupRes.body : 'N/A',
      screenshot: screenshot8,
    });

  } catch (error) {
    console.error('\n❌ Automation error:', error);
    results.passed = false;
    results.error = {
      message: error.message,
      stack: error.stack,
    };
    logStep('FATAL_ERROR', false, { message: error.message });
  } finally {
    await browser.close();
  }

  // Save raw test output JSON for report generator
  const outputPath = path.resolve('/home/sami/Desktop/RepairReach/.agents/worker_journey6/test_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nTest results JSON saved to: ${outputPath}`);

  const allPassed = results.steps.every((s) => s.status === true);
  console.log(`\n================================================================`);
  console.log(`Journey 6 Test Execution Complete: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log(`Total Steps: ${results.steps.length}, Passed: ${results.steps.filter((s) => s.status).length}, Failed: ${results.steps.filter((s) => !s.status).length}`);
  console.log(`================================================================\n`);
}

runFeedbackJourney();
