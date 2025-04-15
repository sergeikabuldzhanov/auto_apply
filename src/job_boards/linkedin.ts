import { Browser, Page } from 'playwright';
import { JobBoard, JobBoardCredentials, JobSearchParameters, JobApplication } from '../types';
import { promises as fs } from 'fs';
import path from 'path';

export class LinkedInAutomation implements JobBoard {
  private browser: Browser;
  private page: Page | null = null;
  private readonly storageStatePath = path.join(process.cwd(), '.auth', 'linkedin.json');

  constructor(browser: Browser) {
    this.browser = browser;
  }

  private async isAuthenticated(): Promise<boolean> {
    try {
      await fs.access(this.storageStatePath);
      return true;
    } catch {
      return false;
    }
  }

  async login(credentials: JobBoardCredentials): Promise<void> {
    // Check if we already have a valid session
    if (await this.isAuthenticated()) {
      console.log('Using existing LinkedIn session...');
      this.page = await this.browser.newPage({
        storageState: this.storageStatePath,
      });

      // Verify the session is still valid
      await this.page.goto('https://www.linkedin.com/feed/');
      const isLoggedIn = await this.page.locator('.profile-card').isVisible();

      if (isLoggedIn) {
        console.log('Session is valid, proceeding...');
        return;
      }

      console.log('Session expired, logging in again...');
      await this.page.close();
    }

    // Create new page and login
    this.page = await this.browser.newPage();
    await this.page.goto('https://www.linkedin.com/login');

    // Fill in login credentials using locators
    const usernameInput = this.page.locator('#username');
    const passwordInput = this.page.locator('#password');
    const submitButton = this.page.locator('button[type="submit"]');

    await usernameInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);
    await submitButton.click();

    // Wait for successful login
    await this.page.waitForURL('https://www.linkedin.com/feed/');

    // Save the storage state for future use
    await this.page.context().storageState({ path: this.storageStatePath });
    console.log('Session saved for future use');
  }

  async searchJobs(params: JobSearchParameters): Promise<void> {
    if (!this.page) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log('Navigating to jobs page...');
    await this.page.goto('https://www.linkedin.com/jobs');

    console.log('Filling search parameters...');
    // Fill in search parameters using locators
    const titleInput = this.page.locator(
      'input[role="combobox"][aria-label="Search by title, skill, or company"]:not([disabled])'
    );
    const locationInput = this.page.locator(
      'input[aria-label="City, state, or zip code"]:not([disabled])'
    );

    // Fill in the inputs
    await titleInput.fill(params.title);
    await locationInput.fill(params.location);

    console.log('Pressing Enter to search...');
    // Press Enter to search
    await this.page.keyboard.press('Enter');

    // Wait for the URL to change to indicate search has started
    await this.page.waitForURL('**/jobs/search/**');

    console.log('Waiting for search results to load...');
    // Wait for the loading indicator to disappear
    const loadingIndicator = this.page.locator('.jobs-search-results-list__loading');
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    } catch (error) {
      console.log('No loading indicator found, proceeding...');
    }

    // Wait for search results
    const resultCount = this.page.getByText(/\d+ results/);
    // check if we have results
    if (await resultCount.isVisible()) {
      console.log('Search results loaded successfully');
    } else {
      console.error('Failed to find search results. Current URL:', await this.page.url());
      console.error('Page content:', await this.page.content());
      throw new Error('Failed to find search results');
    }
  }

  async applyToJob(job: JobApplication, resumePath: string, coverLetter: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not logged in. Call login() first.');
    }

    await this.page.goto(job.url);

    // Click the Easy Apply button if available
    const easyApplyButton = this.page.getByRole('button', { name: 'Easy Apply' });
    if (await easyApplyButton.isVisible()) {
      await easyApplyButton.click();

      // TODO: Implement the application form filling logic
      // This will vary based on the specific job application form

      // Upload resume
      if (resumePath) {
        const fileInput = this.page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(resumePath);
        }
      }

      // Fill in cover letter if provided
      if (coverLetter) {
        const coverLetterInput = this.page.locator('textarea');
        if (await coverLetterInput.isVisible()) {
          await coverLetterInput.fill(coverLetter);
        }
      }

      // Submit application
      const submitButton = this.page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
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
