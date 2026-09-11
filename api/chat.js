// api/chat.js
// DesiLingo AI Tutor backend — powered by Groq (free tier)
// Deploy on Vercel: this file automatically becomes the /api/chat endpoint.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, language } = req.body || {};

  if (!message || !language) {
    return res.status(400).json({ error: "Missing 'message' or 'language'." });
  }

  const languageName = language === "hindi" ? "Hindi" : "Bengali";

  const systemPrompt = `You are a friendly, encouraging ${languageName} language tutor inside an app called DesiLingo AI.
The student writes to you in English. Your job:
- Teach them how to say things in ${languageName}.
- Always give: the ${languageName} script, a simple romanized pronunciation, and a short English meaning.
- If they ask you to correct a sentence, give the corrected version, explain the mistake briefly, and give the natural version.
- Keep replies short (3-6 lines), warm, and beginner-friendly.
- You may use simple HTML tags like <b>, <i>, and <br> for formatting, since the reply is rendered as HTML.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", errText);
      return res.status(502).json({ error: "AI request failed" });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
