import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
  data?: any;
}

async function runJourney1() {
  const screenshotsDir = '/home/sami/Desktop/RepairReach/.agents/worker_journey1/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results: TestResult[] = [];
  const networkRequests: { url: string; method: string; status: number }[] = [];
  const consoleMessages: { type: string; text: string }[] = [];

  console.log('--- Starting Journey 1: Homepage Visitor Automated Browser Run ---');

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RepairReach-Tester'
  });

  const page = await context.newPage();

  // Monitor network
  page.on('request', (req) => {
    // track API calls
    if (req.url().includes('/api/')) {
      console.log(`[Network Request] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      console.log(`[Network Response] ${res.status()} ${res.url()}`);
      networkRequests.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status()
      });
    }
  });

  // Monitor console
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    // 1. Navigate to Homepage
    console.log('Navigating to http://localhost:5173/...');
    const navResponse = await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    const navStatus = navResponse?.status() || 0;

    results.push({
      step: '1. Navigate to Homepage',
      passed: navStatus === 200 || navStatus === 304,
      details: `Navigated to http://localhost:5173/ with HTTP status ${navStatus}`,
      data: { status: navStatus, url: page.url() }
    });

    await page.screenshot({ path: path.join(screenshotsDir, '01_homepage_full.png'), fullPage: true });

    // 2. Verify Hero Section
    console.log('Verifying Hero Section...');
    const heading = await page.locator('h1').first().textContent();
    const badgeText = await page.locator('text=Solapur\'s Premier Appliance Repair Platform').textContent().catch(() => null);
    const subtitle = await page.locator('p.font-body-lg, section p').first().textContent();
    const cancelPill = await page.locator('text=Free Pre-Arrival Cancellation').isVisible();
    const visitPill = await page.locator('text=Standard ₹299 Visit Charge').isVisible();

    const heroPassed =
      heading?.includes('Reliable Appliance Repair at Your Doorstep') &&
      badgeText !== null &&
      cancelPill &&
      visitPill;

    results.push({
      step: '2. Hero Section Elements',
      passed: !!heroPassed,
      details: `Heading: "${heading?.trim()}", Badge: "${badgeText?.trim()}", Free Cancellation visible: ${cancelPill}, Standard ₹299 Visit visible: ${visitPill}`,
      data: { heading, badgeText, subtitle, cancelPill, visitPill }
    });

    // 3. Verify Quick Service Booking Card
    console.log('Verifying Quick Service Booking Card...');
    const quickBookingHeader = await page.locator('h3:has-text("Quick Service Booking")').isVisible();
    const slotsOpenBadge = await page.locator('text=Slots Open Today').isVisible();
    const quickCategories = ['AC Repair', 'Washing Machine', 'Refrigerator', 'Microwave', 'TV & Display'];
    const foundQuickCategories: string[] = [];

    for (const cat of quickCategories) {
      const isVis = await page.locator(`a[href="/book"]:has-text("${cat}")`).isVisible();
      if (isVis) foundQuickCategories.push(cat);
    }

    const checkSlotsBtn = await page.locator('button:has-text("Check Slot Availability")').isVisible();

    results.push({
      step: '3. Quick Service Booking Component',
      passed: quickBookingHeader && slotsOpenBadge && foundQuickCategories.length === 5 && checkSlotsBtn,
      details: `Header visible: ${quickBookingHeader}, Slots Badge: ${slotsOpenBadge}, Categories Found: ${foundQuickCategories.join(', ')}, Check Slots Button: ${checkSlotsBtn}`,
      data: { quickBookingHeader, slotsOpenBadge, foundQuickCategories, checkSlotsBtn }
    });

    // 4. Verify Trust Pillars Section
    console.log('Verifying Trust Pillars...');
    const trustHeading = await page.locator('h2:has-text("Why Solapur Chooses RepairReach")').isVisible();
    const expectedPillars = [
      'Transparent Pricing',
      'Certified Technicians',
      'Same-Day Service',
      '100% Genuine Parts'
    ];
    const foundPillars: { title: string; desc: string }[] = [];

    for (const pTitle of expectedPillars) {
      const card = page.locator(`div:has-text("${pTitle}")`).last();
      const isVis = await page.locator(`h3:has-text("${pTitle}")`).isVisible();
      const desc = await page.locator(`h3:has-text("${pTitle}") + p`).textContent().catch(() => '');
      if (isVis) {
        foundPillars.push({ title: pTitle, desc: desc?.trim() || '' });
      }
    }

    results.push({
      step: '4. Trust Pillars Section',
      passed: trustHeading && foundPillars.length === 4,
      details: `Heading visible: ${trustHeading}, 4 Pillars verified: ${foundPillars.map(p => p.title).join(', ')}`,
      data: { trustHeading, foundPillars }
    });

    // 5. Verify Dynamic Services Grid from Backend
    console.log('Verifying Services Grid from backend...');
    await page.waitForSelector('.grid div:has-text("Book Now")', { timeout: 8000 });
    const serviceCards = page.locator('.grid > div:has-text("Book Now")');
    const cardCount = await serviceCards.count();

    const servicesList: { title: string; price: string; duration: string; doorstep: boolean; workshop: boolean }[] = [];
    for (let i = 0; i < cardCount; i++) {
      const card = serviceCards.nth(i);
      const title = await card.locator('h3').textContent().catch(() => '');
      const price = await card.locator('span.font-manrope, span:has-text("₹")').last().textContent().catch(() => '');
      const duration = await card.locator('span:has-text("mins")').textContent().catch(() => '');
      const doorstep = await card.locator('text=Doorstep Visit').isVisible();
      const workshop = await card.locator('text=Workshop Capable').isVisible();

      servicesList.push({
        title: title?.trim() || '',
        price: price?.trim() || '',
        duration: duration?.trim() || '',
        doorstep,
        workshop
      });
    }

    const servicesApiCalled = networkRequests.some(r => r.url.includes('/api/v1/public/services') && r.status === 200);

    results.push({
      step: '5. Dynamic Services Showcase Grid',
      passed: cardCount === 5 && servicesApiCalled,
      details: `Found ${cardCount} dynamic service cards. Backend API /api/v1/public/services returned 200. Services: ${servicesList.map(s => s.title).join(' | ')}`,
      data: { cardCount, servicesApiCalled, servicesList }
    });

    await page.screenshot({ path: path.join(screenshotsDir, '02_services_grid.png') });

    // 6. Verify Customer Testimonials Preview
    console.log('Verifying Customer Testimonials...');
    const testimonialsHeading = await page.locator('h2:has-text("Customer Experiences")').isVisible();
    const testimonialsApiCalled = networkRequests.some(r => r.url.includes('/api/v1/public/testimonials') && r.status === 200);

    // Count testimonial cards (looking for author and quotes)
    const testimonialCards = page.locator('section:has-text("Customer Experiences") .grid > div');
    const tCount = await testimonialCards.count();

    const testimonialsList: { customer: string; service: string; quote: string }[] = [];
    for (let i = 0; i < tCount; i++) {
      const card = testimonialCards.nth(i);
      const quote = await card.locator('p.italic, p').first().textContent().catch(() => '');
      const customer = await card.locator('span.font-bold').textContent().catch(() => '');
      const service = await card.locator('div.pt-2 span').last().textContent().catch(() => '');
      if (customer) {
        testimonialsList.push({
          customer: customer.trim(),
          service: service?.trim() || '',
          quote: quote?.trim() || ''
        });
      }
    }

    results.push({
      step: '6. Testimonials Preview Section',
      passed: testimonialsHeading && testimonialsList.length >= 3 && testimonialsApiCalled,
      details: `Heading visible: ${testimonialsHeading}, Found ${testimonialsList.length} verified testimonials. API /api/v1/public/testimonials returned 200. Customers: ${testimonialsList.map(t => `${t.customer} (${t.service})`).join(', ')}`,
      data: { testimonialsHeading, testimonialsApiCalled, testimonialsList }
    });

    await page.screenshot({ path: path.join(screenshotsDir, '03_testimonials.png') });

    // 7. Verify Bottom CTA Banner
    console.log('Verifying Bottom CTA Banner...');
    const ctaBannerHeader = await page.locator('h2:has-text("Ready to schedule your repair?")').isVisible();
    const ctaBannerText = await page.locator('p:has-text("transparent ₹299 visiting charges")').isVisible();
    const ctaBannerBtn = await page.locator('button:has-text("Book Service Now")').isVisible();

    results.push({
      step: '7. Bottom CTA Banner',
      passed: ctaBannerHeader && ctaBannerText && ctaBannerBtn,
      details: `Banner header visible: ${ctaBannerHeader}, Pricing mention visible: ${ctaBannerText}, "Book Service Now" button visible: ${ctaBannerBtn}`,
      data: { ctaBannerHeader, ctaBannerText, ctaBannerBtn }
    });

    await page.screenshot({ path: path.join(screenshotsDir, '04_bottom_cta.png') });

    // 8. Test CTA Navigation Interactivity
    console.log('Testing CTA Button Navigations...');
    const ctaNavigationResults: { button: string; targetUrlExpected: string; targetUrlActual: string; passed: boolean }[] = [];

    // 8.1 Hero "Book a Repair" -> /book
    console.log('Testing Hero "Book a Repair" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('section').first().locator('a[href="/book"] button:has-text("Book a Repair")').click();
    await page.waitForTimeout(1000);
    const bookUrl = page.url();
    // Since /book is protected, it redirects to /login or lands on /book / /login
    const bookNavPassed = bookUrl.includes('/book') || bookUrl.includes('/login');
    ctaNavigationResults.push({
      button: 'Hero "Book a Repair"',
      targetUrlExpected: '/book (or /login if unauth)',
      targetUrlActual: bookUrl,
      passed: bookNavPassed
    });

    // 8.2 Hero "View All Services" -> /services
    console.log('Testing Hero "View All Services" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('section').first().locator('a[href="/services"] button:has-text("View All Services")').click();
    await page.waitForTimeout(1000);
    const servicesUrl = page.url();
    const servicesNavPassed = servicesUrl.includes('/services');
    ctaNavigationResults.push({
      button: 'Hero "View All Services"',
      targetUrlExpected: '/services',
      targetUrlActual: servicesUrl,
      passed: servicesNavPassed
    });

    // 8.3 Services Section "View Full Catalog" -> /services
    console.log('Testing "View Full Catalog" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('section:has-text("Our Repair Services") a[href="/services"]').click();
    await page.waitForTimeout(1000);
    const catalogUrl = page.url();
    const catalogNavPassed = catalogUrl.includes('/services');
    ctaNavigationResults.push({
      button: 'Services Section "View Full Catalog"',
      targetUrlExpected: '/services',
      targetUrlActual: catalogUrl,
      passed: catalogNavPassed
    });

    // 8.4 Testimonials Section "Read All Reviews" -> /testimonials
    console.log('Testing "Read All Reviews" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('section:has-text("Customer Experiences") a[href="/testimonials"]').click();
    await page.waitForTimeout(1000);
    const reviewsUrl = page.url();
    const reviewsNavPassed = reviewsUrl.includes('/testimonials');
    ctaNavigationResults.push({
      button: 'Testimonials "Read All Reviews"',
      targetUrlExpected: '/testimonials',
      targetUrlActual: reviewsUrl,
      passed: reviewsNavPassed
    });

    // 8.5 Bottom Banner "Book Service Now" -> /book
    console.log('Testing Bottom Banner "Book Service Now" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('section:has-text("Ready to schedule your repair?") a[href="/book"]').click();
    await page.waitForTimeout(1000);
    const bottomBookUrl = page.url();
    const bottomBookNavPassed = bottomBookUrl.includes('/book') || bottomBookUrl.includes('/login');
    ctaNavigationResults.push({
      button: 'Bottom Banner "Book Service Now"',
      targetUrlExpected: '/book (or /login)',
      targetUrlActual: bottomBookUrl,
      passed: bottomBookNavPassed
    });

    // 8.6 Quick Category Link (e.g. "Washing Machine") -> /book
    console.log('Testing Quick Service Link "Washing Machine"...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('a[href="/book"]:has-text("Washing Machine")').click();
    await page.waitForTimeout(1000);
    const quickLinkUrl = page.url();
    const quickLinkPassed = quickLinkUrl.includes('/book') || quickLinkUrl.includes('/login');
    ctaNavigationResults.push({
      button: 'Quick Category "Washing Machine"',
      targetUrlExpected: '/book (or /login)',
      targetUrlActual: quickLinkUrl,
      passed: quickLinkPassed
    });

    // 8.7 Service Card "Book Now" Button -> /book?serviceId=...
    console.log('Testing Service Card "Book Now" button...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.grid div:has-text("Book Now")');
    const firstServiceBookLink = page.locator('a[href*="/book?serviceId="]').first();
    const expectedHref = await firstServiceBookLink.getAttribute('href');
    await firstServiceBookLink.click();
    await page.waitForTimeout(1000);
    const serviceBookUrl = page.url();
    const serviceBookPassed = serviceBookUrl.includes('/book') || serviceBookUrl.includes('/login');
    ctaNavigationResults.push({
      button: 'Service Card "Book Now"',
      targetUrlExpected: expectedHref || '/book?serviceId=...',
      targetUrlActual: serviceBookUrl,
      passed: serviceBookPassed
    });

    const allCtasPassed = ctaNavigationResults.every(r => r.passed);

    results.push({
      step: '8. CTA Navigation Interactivity',
      passed: allCtasPassed,
      details: `Tested ${ctaNavigationResults.length} interactive CTAs and navigation targets. All passed: ${allCtasPassed}`,
      data: { ctaNavigationResults }
    });

  } catch (error: any) {
    console.error('Error during test execution:', error);
    results.push({
      step: 'Execution Failure',
      passed: false,
      details: `Encountered exception: ${error.message}`,
      data: { stack: error.stack }
    });
  } finally {
    await browser.close();
  }

  // Write detailed execution log
  const logOutputPath = '/home/sami/Desktop/RepairReach/.agents/worker_journey1/browser_test_log.json';
  fs.writeFileSync(
    logOutputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalSteps: results.length,
        passedSteps: results.filter(r => r.passed).length,
        failedSteps: results.filter(r => !r.passed).length,
        results,
        networkRequests,
        consoleMessages
      },
      null,
      2
    )
  );

  console.log('--- Journey 1 Automated Browser Run Completed ---');
  console.log(`Saved log to ${logOutputPath}`);
}

runJourney1();
