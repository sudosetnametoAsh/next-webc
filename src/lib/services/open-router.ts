import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "", // Ensure API key is present
});

// Helper function to pause execution (for the retry delay)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function OpenRouterAI({
  task,
}: {
  task: string;
}): Promise<string[]> {
  const prompt = `
    You are a strict document validation assistant.

    User Task:
    "${task}"

    Generate exactly 10 highly specific keywords that must appear in the document text to confirm it matches the task.

    Rules:
    - Keywords must be concrete and task-specific (avoid generic words like "document", "form", "official").
    - Keywords must be in lower case
    - Do not repeat similar variations.
    - Return exactly 10 items.
    - Output must be a raw JSON array of strings.
    - Do not include explanations, markdown, numbering, or code blocks.

    Example output:
    ["radiologist", "radiograph", "DICOM", "fracture", "anatomy", "exposure", "diagnostic", "pathology", "lateral", "x-ray"]
`;

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000; // 5 seconds

  // --- RETRY LOOP START ---
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. Attempt the API call
      const stream = await openrouter.chat.send({
        chatGenerationParams: {
          model: "deepseek/deepseek-v3.2",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: true,
        },
      });

      let response = "";

      // 2. Process the stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
          response += content;
        }
      }

      // 3. Parse the JSON robustly
      const trimmedResponse = response.trim();

      // Use Regex to find the first array [...] in the response
      // This prevents crashing if the AI says "Here is the JSON: [...] "
      const jsonArrayMatch = trimmedResponse.match(/\[.*\]/s);

      if (!jsonArrayMatch) {
        throw new Error("No valid JSON array found in AI response.");
      }

      const result = JSON.parse(jsonArrayMatch[0]);

      // Validate the result is actually an array
      if (!Array.isArray(result)) {
        throw new Error("AI response was not a valid array.");
      }

      // Success! Return the result
      return result;
    } catch (error: any) {
      // 4. Handle Errors
      const isRateLimit =
        error.statusCode === 429 ||
        (error.body && JSON.parse(error.body)?.error?.code === 429);

      console.error(`Attempt ${attempt + 1} failed.`, error.message || error);

      // If it's a rate limit and we haven't exhausted retries, wait and try again
      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        console.warn(
          `Rate limit detected. Waiting ${RETRY_DELAY_MS / 1000} seconds before retrying...`,
        );
        await sleep(RETRY_DELAY_MS);
        continue; // Loop again
      }

      // If it's a different error or we are out of retries, give up
      console.error("Failed to get response after retries or fatal error.");
      return [];
    }
  }
  // --- RETRY LOOP END ---

  return []; // Fallback return (should technically be unreachable)
}
