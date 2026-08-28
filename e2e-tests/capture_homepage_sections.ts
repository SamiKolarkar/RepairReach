import { chromium } from 'playwright';
import * as path from 'path';

async function captureDetailedScreenshots() {
  const screenshotsDir = '/home/sami/Desktop/RepairReach/.agents/worker_journey1/screenshots';

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Full page
  await page.screenshot({ path: path.join(screenshotsDir, '01_homepage_fullpage.png'), fullPage: true });

  // Hero section
  const heroSection = page.locator('section').first();
  await heroSection.screenshot({ path: path.join(screenshotsDir, '02_hero_section.png') });

  // Quick booking card
  const quickBookingCard = page.locator('section').first().locator('.lg\\:col-span-5');
  await quickBookingCard.screenshot({ path: path.join(screenshotsDir, '03_quick_booking_card.png') });

  // Trust pillars
  const trustSection = page.locator('section:has-text("Why Solapur Chooses RepairReach")');
  await trustSection.screenshot({ path: path.join(screenshotsDir, '04_trust_pillars.png') });

  // Services section
  const servicesSection = page.locator('section:has-text("Our Repair Services")');
  await servicesSection.screenshot({ path: path.join(screenshotsDir, '05_services_showcase.png') });

  // Testimonials section
  const testimonialsSection = page.locator('section:has-text("Customer Experiences")');
  await testimonialsSection.screenshot({ path: path.join(screenshotsDir, '06_testimonials_section.png') });

  // Bottom CTA
  const bottomCta = page.locator('section:has-text("Ready to schedule your repair?")');
  await bottomCta.screenshot({ path: path.join(screenshotsDir, '07_bottom_cta_banner.png') });

  console.log('Detailed section screenshots captured successfully.');
  await browser.close();
}

captureDetailedScreenshots();
