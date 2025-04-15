import { Browser, Page } from 'playwright';
import { JobBoard, JobBoardCredentials, JobSearchParameters, JobApplication } from '../types';

export class LinkedInAutomation implements JobBoard {
  private browser: Browser;
  private page: Page | null = null;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async login(credentials: JobBoardCredentials): Promise<void> {
    this.page = await this.browser.newPage();
    await this.page.goto('https://www.linkedin.com/login');
    
    // Fill in login credentials
    await this.page.fill('#username', credentials.email);
    await this.page.fill('#password', credentials.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await this.page.waitForNavigation();
  }

  async searchJobs(params: JobSearchParameters): Promise<void> {
    if (!this.page) {
      throw new Error('Not logged in. Call login() first.');
    }

    await this.page.goto('https://www.linkedin.com/jobs');
    
    // Fill in search parameters
    await this.page.fill('.jobs-search-box__text-input', params.title);
    await this.page.fill('.jobs-search-box__text-input[aria-label="Location"]', params.location);
    await this.page.keyboard.press('Enter');
    
    // Wait for search results
    await this.page.waitForSelector('.jobs-search-results-list');
  }

  async applyToJob(job: JobApplication, resumePath: string, coverLetter: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not logged in. Call login() first.');
    }

    await this.page.goto(job.url);
    
    // Click the Easy Apply button if available
    const easyApplyButton = await this.page.$('.jobs-apply-button');
    if (easyApplyButton) {
      await easyApplyButton.click();
      
      // TODO: Implement the application form filling logic
      // This will vary based on the specific job application form
      
      // Upload resume
      if (resumePath) {
        const fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(resumePath);
        }
      }
      
      // Fill in cover letter if provided
      if (coverLetter) {
        const coverLetterInput = await this.page.$('textarea');
        if (coverLetterInput) {
          await coverLetterInput.fill(coverLetter);
        }
      }
      
      // Submit application
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
  }
} 