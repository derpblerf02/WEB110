// This is our serverless function acting as a secure gateway.

export default async function handler(request, response) {
  // 1. Get the user's prompt from the request and perform basic validation.
  const { userPrompt } = request.body;

  if (!userPrompt || userPrompt.trim().length === 0) {
    return response.status(400).json({ error: 'Prompt cannot be empty.' });
  }

  const fullPrompt = `
  You are an expert Midjourney prompt engineer. Your task is to take a user's simple idea and expand it into a detailed, structured prompt in this exact format:
  <Foreground: [detailed description]> <Midground: [detailed description]> <Background: [detailed description]> | <Style: [detailed description]>

  User's Idea: "${userPrompt}"

  Output the optimized prompt as a single line starting with: Optimized Prompt: `;

  try {
    const hfResponse = await fetch(
  "https://api-inference.huggingface.co/models/gpt2",
  {
    headers: {
      "Authorization": `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  }
);

    if (!hfResponse.ok) {
        // If Hugging Face returns an error, forward it to the user.
        const errorBody = await hfResponse.text();
        console.error("Hugging Face API Error:", errorBody);
        return response.status(hfResponse.status).json({ error: `Hugging Face API error: ${errorBody}` });
    }

    const data = await hfResponse.json();

    // 4. Extract the generated text and send it back to the frontend.
    const optimizedText = data[0].generated_text.trim();
    response.status(200).json({ optimizedText });

  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'An internal server error occurred.' });
  }
}
