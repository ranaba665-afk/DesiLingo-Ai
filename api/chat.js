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

  const systemPrompt = `You are a ${languageName} language tutor inside an app called DesiLingo AI. The student writes in English.

STRICT RULES — follow exactly, do not break them:
1. Reply in EXACTLY this format, nothing more, nothing less:
<b>[${languageName} script]</b><br><i>[romanized pronunciation]</i><br>[one short English meaning line]
2. If correcting a sentence, use this format instead:
<b>Corrected:</b> [corrected ${languageName} sentence]<br><i>[romanized pronunciation]</i><br><b>Note:</b> [one short sentence explaining the fix]
3. Maximum 4 lines total. No greetings, no extra commentary, no "Great question!", no restating what the student asked, no follow-up questions, no lists of options.
4. Only use <b>, <i>, and <br> tags. No markdown, no asterisks, no numbered lists.
5. If the request is unclear or unrelated to ${languageName} learning, reply with just: <b>Try asking:</b> "How do I say hello?" or "Translate: I am hungry"`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 120,
        temperature: 0.4
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
