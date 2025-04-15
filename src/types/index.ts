import { Browser, Page } from 'playwright';

export interface JobBoardCredentials {
  email: string;
  password: string;
}

export interface JobSearchParameters {
  title: string;
  location: string;
  maxApplicationsPerDay: number;
}

export interface JobApplication {
  url: string;
  title: string;
  company: string;
  description: string;
}

export interface JobBoard {
  login(credentials: JobBoardCredentials): Promise<void>;
  searchJobs(params: JobSearchParameters): Promise<void>;
  applyToJob(job: JobApplication, resumePath: string, coverLetter: string): Promise<void>;
  close(): Promise<void>;
}
