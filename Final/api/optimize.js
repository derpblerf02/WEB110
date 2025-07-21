// This is our serverless function acting as a secure gateway.

import Groq from 'groq-sdk';
import formidable from 'formidable';
import fs from 'fs/promises'; // For reading file buffers

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse FormData (handles files and fields)
  const form = formidable({ multiples: false });
  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve([fields, files]);
    });
  });

  const userPrompt = fields.userPrompt?.[0] || '';
  const imageUrl = fields.imageUrl?.[0] || '';
  let base64Image = '';

  if (!userPrompt.trim()) {
    return res.status(400).json({ error: 'Prompt cannot be empty.' });
  }

  // Handle image: File upload takes priority over URL
  if (files.image?.[0]) {
    const file = files.image[0];
    const buffer = await fs.readFile(file.filepath);
    base64Image = buffer.toString('base64');
    // Clean up temp file
    await fs.unlink(file.filepath);
  } else if (imageUrl) {
    // For URLs, Groq supports direct URLs (no need for base64)
    // But if needed, you could fetch and convert here
  }

  // 2. Update prompt to handle image if provided
  let fullPrompt = `
    You are an expert Midjourney prompt engineer. Your task is to take a user's simple idea and expand it into a detailed, structured prompt. The output must be a single line following this exact format:
    <Foreground: [detailed description]> <Midground: [detailed description]> <Background: [detailed description]> | <Style: [detailed description]>

    User's Idea: "${userPrompt}"`;

  if (base64Image || imageUrl) {
    fullPrompt = `
      Analyze the provided image and use it to optimize a Midjourney prompt based on the user's idea. Describe key elements from the image (colors, subjects, style) and incorporate them into the structured prompt.
      
      User's Idea: "${userPrompt}"
      
      Optimized Prompt:`;
  } else {
    fullPrompt += `
Optimized Prompt:`;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Build messages with image if provided
    const messageContent = [{ type: 'text', text: fullPrompt }];
    if (base64Image) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}` } // Assume JPEG; adjust if needed
      });
    } else if (imageUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    const completion = await groq.chat.completions.create({
  messages: [{ role: 'user', content: messageContent }],
  model: 'llama-4-scout-17b-16e-instruct',  // <-- Change to this valid vision model
  temperature: 1,
  max_tokens: 1024,
  top_p: 1
});

    const optimizedText = completion.choices[0].message.content.trim();
    res.status(200).json({ optimizedText });

  } catch (error) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: 'An internal server error occurred: ' + error.message });
  }
}
