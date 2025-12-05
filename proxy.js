// api/proxy.js

const { GoogleGenAI } = require("@google/genai");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- Middleware Setup ---
// Enable CORS for cross-origin requests from your frontend
app.use(cors({
    // IMPORTANT: For production, change '*' to your specific frontend domain (e.g., 'https://your-frontend-app.vercel.app')
    origin: 'https://codelistener-99672247-61ed5.web.app/', 
    methods: ['POST'],
}));

// Parse JSON bodies from incoming requests
app.use(bodyParser.json());

// --- POST Route for Gemini API ---
app.post('/gemini', async (req, res) => {
    // 1. Get the API Key from the SECURE Vercel Environment Variable
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is missing on the server. Check Vercel Environment Variables.' });
    }

    try {
        // Initialize the client securely
        const ai = new GoogleGenAI(GEMINI_API_KEY);

        // Get content from the request body (sent by your frontend)
        const userPrompt = req.body.prompt;
        
        if (!userPrompt) {
            return res.status(400).json({ error: 'Missing required "prompt" in request body.' });
        }

        // Call the Gemini 2.5 Flash model
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
        });

        // 3. Send the result back to the frontend
        res.status(200).json({ 
            text: response.text,
            usage: response.usageMetadata 
        });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Failed to communicate with the Gemini API.', details: error.message });
    }
});

// --- VERCEL EXPORT ---
// Vercel uses this export to handle the incoming HTTP request.
module.exports = app;
