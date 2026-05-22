import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Server port rules
const PORT = 3000;

const app = express();
app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': "aistudio-build",
    }
  }
});

// AI Question Generator Endpoint
app.post("/api/generate-questions", async (req, res) => {
  const { subject, difficulty, type, language, topic } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in secrets.");
    }

    const sysPrompt = `You are a curriculum-specific academic examiner. Your job is to generate a high-quality exam question set.
Return all fields in the selected language (${language}). If language is Bangla, generate content in native academic Bangla (avoid spelling mistakes and use standard curricular terms).
Subject: ${subject}
Difficulty: ${difficulty}
Question Type: ${type}
Specific topic (optional restriction): ${topic || "General subject curriculum"}.

For MCQ type: generate exactly 10 questions. Each must have a question text, exactly 4 distinct options, and a correct answer indicating which option is correct.
For CQ (Creative Question / সৃজনশীল) type: generate exactly 3 creative questions. Each creative question must have a 'scenario' (উদ্দীপক / passage / math stem) followed by exactly 4 step-by-step subquestions (typically ক, খ, গ, ঘ in Bangla or a, b, c, d in English) representing increasing difficulty (Knowledge, Understanding, Application, Higher Ability).
For Short Question type: generate exactly 10 short questions. Each must have a question text and a concise sample answer.

Ensure the difficulty matches strictly:
- Easy: simple recall, basic problems.
- Medium: moderate application, two-step logic.
- Hard: critical thinking, non-routine problems.

Output MUST strictly conform to the JSON schema requested in the API call. No additional conversational wrapper, markdown outer formatting, or explanations should be printed. Just valid, parsable JSON.`;

    // Let's model a robust schema based on types so parser doesn't fail
    let responseSchema;
    if (type === "MCQ") {
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A formal title for the quiz/examination paper" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                questionText: { type: Type.STRING, description: "The content of the question" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 options"
                },
                correctAnswer: { type: Type.STRING, description: "The single correct answer which must be identical to one of the options" }
              },
              required: ["id", "questionText", "options", "correctAnswer"]
            }
          }
        },
        required: ["title", "questions"]
      };
    } else if (type === "CQ") {
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A formal title for the creative writing/theory exam" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                scenario: { type: Type.STRING, description: "The scenario or stimulus text (উদ্দীপক) forming the background of the question" },
                subQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 incremental questions based on the scenario"
                }
              },
              required: ["id", "scenario", "subQuestions"]
            }
          }
        },
        required: ["title", "questions"]
      };
    } else {
      // Short type
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A formal title for the short answer exam" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                questionText: { type: Type.STRING, description: "The short question text" },
                sampleAnswer: { type: Type.STRING, description: "A concise target answer" }
              },
              required: ["id", "questionText", "sampleAnswer"]
            }
          }
        },
        required: ["title", "questions"]
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a full question set for standard ${subject} curriculum in ${language}.`,
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      }
    });

    const outputText = response.text || "{}";
    res.json(JSON.parse(outputText));
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate question set." });
  }
});

// AI Remark & Suggestion Generator Endpoint
app.post("/api/generate-remarks", async (req, res) => {
  const { studentName, marks, average, gpa, isPass, gradingScale } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in secrets.");
    }

    const marksSummary = Object.entries(marks || {})
      .map(([sub, score]) => `${sub}: ${score}/100`)
      .join(", ");

    const sysPrompt = `You are an expert AI academic counselor and school teacher. 
Your goal is to evaluate the student's performance based on their subject marks, average percentage, GPA, and general status, and output helpful, personalized remarks and study guidelines.

Input Details:
- Student Name: ${studentName || "The student"}
- Marks Breakdown: ${marksSummary || "No marks submitted"}
- Average Percentage: ${average ? average.toFixed(1) : "N/A"}%
- GPA (on selected scale): ${gpa ? gpa.toFixed(2) : "0.00"}
- Status: ${isPass ? "Pass/Promoted" : "Fail/Retained"}
- Grading System: ${gradingScale || "General Board"}

Provide encouragement if the student did well, or positive developmental support if they struggled. Keep suggestions action-oriented, respectful, and friendly.

Output MUST conform strictly to the requested JSON schema.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        remarks: { type: Type.STRING, description: "A high-quality academic remark from the teacher (max 2 sentences, encouraging and concise)." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1 or 2 specific areas or subjects where the student demonstrated strength/aptitude." },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1 or 2 subjects or key areas where they need to focalize attention or obtain extra tutoring." },
        actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2 concrete, practical, easy-to-follow study suggestions or tips for the student and guardians." }
      },
      required: ["remarks", "strengths", "weaknesses", "actionableSuggestions"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Analyze the student marks and generate constructive teacher feedback.",
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.6,
      }
    });

    const outputText = response.text || "{}";
    res.json(JSON.parse(outputText));
  } catch (error) {
    console.error("AI Remarks Generation Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate AI remarks." });
  }
});

// Configure Vite and static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
