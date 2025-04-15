const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function customizeResume(jobDescription, currentResume) {
  const prompt = `Given the following job description and current resume, customize the resume to better match the job requirements while maintaining truthfulness:

Job Description:
${jobDescription}

Current Resume:
${currentResume}

Please provide a customized version of the resume that highlights relevant skills and experiences.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional resume writer. Customize resumes to match job descriptions while maintaining honesty and accuracy."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function generateCoverLetter(jobDescription, resume) {
  const prompt = `Write a compelling cover letter for the following job description, using information from the provided resume:

Job Description:
${jobDescription}

Resume:
${resume}

Please write a professional cover letter that highlights relevant skills and experiences.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a professional cover letter writer. Create compelling, personalized cover letters that highlight relevant skills and experiences."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = {
  customizeResume,
  generateCoverLetter
}; 