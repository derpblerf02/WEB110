// This is our serverless function acting as a secure gateway.

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
    // 3. Call the Hugging Face Inference API.
    // We're using a powerful, instruction-following model like Mistral 7B.
    const hfResponse = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/phi-2",
      {
        headers: {
          // Use the API key securely stored as an environment variable.
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 250, // Limit the length of the response
            temperature: 0.7,   // Add some creativity
            return_full_text: false, // Only return the generated part
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
