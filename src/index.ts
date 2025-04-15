import 'dotenv/config';
import { chromium, Browser } from 'playwright';
import { LinkedInAutomation } from './job_boards/linkedin';
import { customizeResume, generateCoverLetter } from './utils/openai';
import { promises as fs } from 'fs';
import { JobBoardCredentials, JobSearchParameters } from './types';

const isDev = process.env.NODE_ENV === 'development';

async function main(): Promise<void> {
  console.log('Starting job application automation...');

  // Initialize browser
  const browser: Browser = await chromium.launch({
    headless: false, // Set to true for production
  });

  try {
    // Initialize LinkedIn automation
    const linkedin = new LinkedInAutomation(browser);

    // Login to LinkedIn
    console.log('Logging in to LinkedIn...');
    const linkedinCredentials: JobBoardCredentials = {
      email: process.env.LINKEDIN_EMAIL || '',
      password: process.env.LINKEDIN_PASSWORD || '',
    };
    await linkedin.login(linkedinCredentials);

    // Search for jobs
    console.log('Searching for jobs...');
    const searchParams: JobSearchParameters = {
      title: process.env.JOB_TITLE || 'Software Engineer',
      location: process.env.LOCATION || 'Remote',
      maxApplicationsPerDay: parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '10', 10),
    };
    await linkedin.searchJobs(searchParams);

    // Read default resume
    const defaultResume = await fs.readFile(process.env.DEFAULT_RESUME_PATH || '', 'utf-8');

    // TODO: Implement job listing scraping and application logic
    // This would involve:
    // 1. Scraping job listings
    // 2. For each job:
    //    - Get job description
    //    - Customize resume
    //    - Generate cover letter
    //    - Apply to job

    console.log('Job application automation completed.');
  } catch (error) {
    console.error('An error occurred:', error);
    if (isDev) {
      console.log('Browser kept open for debugging. Press Ctrl+C to close.');
      // Keep the process running
      process.stdin.resume();
    } else {
      await browser.close();
    }
    process.exit(1);
  } finally {
    if (!isDev) {
      await browser.close();
    }
  }
}

main().catch(console.error);
