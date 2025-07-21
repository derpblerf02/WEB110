// This is our serverless function acting as a secure gateway.

import Groq from 'groq-sdk';

export default async function handler(request, response) {
  // 1. Get the user's prompt from the request and perform basic validation.
  const { userPrompt } = request.body;

  if (!userPrompt || userPrompt.trim().length === 0) {
    return response.status(400).json({ error: 'Prompt cannot be empty.' });
  }

  // 2. This is the "secret sauce." We create a detailed prompt for the LLM.
  // This guides the model to give us a response in the exact format we want.
  const fullPrompt = `
    You are an expert Midjourney prompt engineer. Your task is to take a user's simple idea and expand it into a detailed, structured prompt. The output must be a single line following this exact format:
    <Foreground: [detailed description]> <Midground: [detailed description]> <Background: [detailed description]> | <Style: [detailed description]>

    User's Idea: "${userPrompt}"

    Optimized Prompt:`;

  try {
    // 3. Initialize Groq client with your API key from env vars.
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Call the Groq API for chat completion.
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'user', content: fullPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 1,
      max_tokens: 1024,
      top_p: 1
    });

    // 4. Extract the generated text and send it back to the frontend.
    const optimizedText = completion.choices[0].message.content.trim();
    response.status(200).json({ optimizedText });

  } catch (error) {
    console.error("Groq API Error:", error);
    response.status(500).json({ error: 'An internal server error occurred: ' + error.message });
  }
}
