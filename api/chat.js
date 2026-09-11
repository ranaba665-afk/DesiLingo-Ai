export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const { message, language } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const targetLanguage =
      language === "bengali"
        ? "Bengali"
        : "Hindi";

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({

          model: "gpt-5-mini",

          instructions:
            `You are DesiLingo AI, a friendly language tutor.
             The student's target language is ${targetLanguage}.
             Help the student learn naturally and simply.
             When useful, provide:
             - target-language sentence
             - English meaning
             - pronunciation help
             - simple grammar explanation.
             Keep answers friendly, concise and suitable for beginners.`,

          input: message.trim()

        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI API request failed"
      });

    }

    const reply =
      data.output_text ||
      "Sorry, I could not generate a response.";

    return res.status(200).json({
      reply: reply
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });

  }

}
