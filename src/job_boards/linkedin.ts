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

  private async handleEasyApplyForm(): Promise<void> {
    if (!this.page) return;

    // Wait for the Easy Apply modal to appear
    const modal = this.page.locator('.jobs-easy-apply-modal');
    if (await modal.isVisible()) {
      console.log('Easy Apply modal found, proceeding...');
    } else {
      console.error('Failed to find Easy Apply modal');
      throw new Error('Failed to find Easy Apply modal');
    }

    // Handle each step of the form
    let currentStep = 1;
    let isFormComplete = false;
    while (!isFormComplete) {
      console.log(`Processing step ${currentStep}...`);

      // Wait for the current step to be visible
      const stepContent = this.page.locator(`.jobs-easy-apply-content__step-${currentStep}`);
      if (!(await stepContent.isVisible())) {
        console.log('No more steps found, assuming application is complete');
        isFormComplete = true;
        break;
      }

      // Try to find and click the next button
      const nextButton = this.page.getByRole('button', { name: /next|submit|review/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Wait for the next step to load
        await this.page.waitForTimeout(1000);
        currentStep++;
      } else {
        console.log('No next button found, assuming application is complete');
        isFormComplete = true;
        break;
      }
    }
  }

  private async uploadResume(resumePath: string): Promise<void> {
    if (!this.page) return;
    const resumeInput = this.page.locator('input[type="file"]');
    await resumeInput.setInputFiles(resumePath);
    // wait for the file to be uploaded
    // response includes the file name and 201 status code
    const fileName = resumePath.split('/')[resumePath.split('/').length - 1];
    await this.page.waitForResponse(response => {
      return response.status() === 201 && response.url().includes(fileName);
    });
  }

  async applyToJob(job: JobApplication, resumePath: string, coverLetter: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not logged in. Call login() first.');
    }

    console.log(`Applying to job: ${job.title} at ${job.company}`);
    await this.page.goto(job.url);

    // Click the Easy Apply button if available
    const easyApplyButton = this.page.getByRole('button', { name: 'Easy Apply' });
    if (await easyApplyButton.isVisible()) {
      console.log('Found Easy Apply button, starting application process...');
      await easyApplyButton.click();

      try {
        await this.handleEasyApplyForm();
        console.log('Application process completed successfully');
      } catch (error) {
        console.error('Error during application process:', error);
        throw error;
      }
    } else {
      console.log('No Easy Apply button found for this job');
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
  }
}
