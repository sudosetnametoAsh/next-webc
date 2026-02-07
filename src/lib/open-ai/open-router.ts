import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: `${process.env.OPENROUTER_API_KEY}`,
});

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

  try {
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: "tngtech/deepseek-r1t2-chimera:free",
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

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
        response += content;
      }
    }

    const result = JSON.parse(response.trim());

    return result;
  } catch (error) {
    console.error("Failed to get Response", error);
    return [];
  }
}
