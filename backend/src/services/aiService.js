'use strict';

const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateAIInsights = async ({ project, goals }) => {
  try {
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const overdueGoals = goals.filter(
      (g) => g.status !== 'completed' && new Date(g.due_date) < new Date()
    ).length;

    const prompt = `You are an expert academic research mentor. Analyze this PhD/research project and provide actionable insights.

Project Title: ${project.title}
Research Type: ${project.type}
Progress: ${project.completion_percentage}%
Start Date: ${project.start_date}
Expected End Date: ${project.expected_end_date}
Scholar: ${project.scholar_name}
Total Goals: ${goals.length}
Completed Goals: ${completedGoals}
Overdue Goals: ${overdueGoals}

Recent Goals:
${goals.slice(0, 10).map((g) => `- ${g.title}: ${g.status} (${g.completion_percentage}%)`).join('\n')}

Provide a JSON response with:
{
  "overallAssessment": "brief assessment",
  "progressRating": "on_track|slightly_delayed|significantly_delayed|at_risk",
  "riskScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["action1", "action2", "action3"],
  "predictedCompletionDate": "YYYY-MM-DD",
  "nextSteps": ["step1", "step2"],
  "motivationalMessage": "personalized message for the scholar"
}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    logger.error('AI insights generation failed:', err.message);
    return {
      overallAssessment: 'AI analysis temporarily unavailable',
      progressRating: 'unknown',
      riskScore: 0,
      recommendations: ['Continue with current research plan'],
      error: true,
    };
  }
};

const generateGoalsFromObjective = async ({ researchTitle, researchType, duration }) => {
  try {
    const prompt = `Generate a comprehensive, structured research plan with SMART goals for:
Research Title: ${researchTitle}
Type: ${researchType}
Duration: ${duration} months

Return JSON with:
{
  "phases": [
    {
      "name": "Phase name",
      "duration_months": N,
      "goals": [
        {
          "title": "Goal title",
          "description": "Detailed description",
          "category": "literature_review|methodology|data_collection|analysis|writing|publication",
          "priority": "high|medium|low",
          "estimated_days": N,
          "milestones": [
            {"title": "Milestone", "description": "Details"}
          ]
        }
      ]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    logger.error('AI goal generation failed:', err.message);
    throw err;
  }
};

const summarizeDiscussion = async (messages) => {
  try {
    const conversation = messages.map((m) => `${m.senderName}: ${m.content}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an academic assistant. Summarize the following discussion concisely, highlighting key decisions, action items, and next steps.',
        },
        { role: 'user', content: conversation },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  } catch (err) {
    logger.error('AI summarization failed:', err.message);
    return 'Summary unavailable';
  }
};

const checkPlagiarism = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Analyze the following academic text for potential plagiarism indicators.
          Return JSON: { "riskScore": 0-100, "indicators": [], "recommendation": "string" }`,
        },
        { role: 'user', content: text.slice(0, 3000) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    logger.error('Plagiarism check failed:', err.message);
    return { riskScore: 0, indicators: [], recommendation: 'Manual review recommended' };
  }
};

const generatePerformanceReport = async ({ student, goals, attendance, submissions }) => {
  try {
    const prompt = `Generate a professional academic performance report for:
Student: ${student.first_name} ${student.last_name}
Goals Completion: ${goals.completed}/${goals.total} (${Math.round((goals.completed / goals.total) * 100)}%)
Attendance: ${attendance.rate}%
Assignments Submitted: ${submissions.submitted}/${submissions.total}

Return JSON:
{
  "summary": "overall performance summary",
  "grade": "A|B|C|D|F",
  "strengths": ["strength1"],
  "areasForImprovement": ["area1"],
  "facultyRemarks": "professional remarks",
  "recommendations": ["recommendation1"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    logger.error('Report generation failed:', err.message);
    return { summary: 'Performance report generation failed', error: true };
  }
};

const academicAssistantChat = async ({ userMessage, context, conversationHistory }) => {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are an expert academic research assistant for a university platform.
You help professors, PhD scholars, and students with research guidance, thesis writing,
literature reviews, methodology selection, and academic queries.
Context: ${JSON.stringify(context || {})}`,
      },
      ...(conversationHistory || []),
      { role: 'user', content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content;
  } catch (err) {
    logger.error('AI assistant error:', err.message);
    throw err;
  }
};

module.exports = {
  generateAIInsights,
  generateGoalsFromObjective,
  summarizeDiscussion,
  checkPlagiarism,
  generatePerformanceReport,
  academicAssistantChat,
};
