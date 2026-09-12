// api/chat.js
// DesiLingo AI Tutor backend — powered by Groq (free tier)
// Deploy on Vercel: this file automatically becomes the /api/chat endpoint.
// Supports two modes:
//   mode: "tutor"    -> short Q&A tutor replies (default, backward compatible)
//   mode: "roleplay" -> multi-turn real-life conversation practice (Phase 5)

const scenarioPersonas = {
  restaurant: {
    label: "Restaurant",
    role: "a friendly waiter/waitress at a local restaurant",
    setting: "The student has just sat down at your restaurant and is about to order food."
  },
  travel: {
    label: "Travel",
    role: "a helpful stranger/station staff member at a train station or airport",
    setting: "The student is traveling and needs help with directions, tickets, or transport."
  },
  shopping: {
    label: "Shopping",
    role: "a shopkeeper at a local market or clothing store",
    setting: "The student is shopping and wants to ask about prices, sizes, or items."
  },
  family: {
    label: "Family",
    role: "a warm family member (like an aunt or elder) at a family gathering",
    setting: "The student is chatting casually with family about daily life."
  },
  friends: {
    label: "Friends",
    role: "a close friend of the same age",
    setting: "The student is having a casual, fun conversation with a friend about plans or hobbies."
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, language, mode, scenario, history } = req.body || {};

  if (!message || !language) {
    return res.status(400).json({ error: "Missing 'message' or 'language'." });
  }

  const languageName = language === "hindi" ? "Hindi" : "Bengali";
  const isRoleplay = mode === "roleplay";

  let systemPrompt;

  if (isRoleplay) {
    const persona = scenarioPersonas[scenario] || scenarioPersonas.friends;

    systemPrompt = `You are role-playing as ${persona.role} for a ${languageName} conversation practice app called DesiLingo AI.
${persona.setting}
The student is a beginner learning ${languageName}. They may write in English or broken ${languageName}.

STRICT RULES:
1. Stay in character the entire time. Never break character or mention you are an AI.
2. Reply in EXACTLY this format:
<b>[${languageName} script reply, 1-2 short sentences]</b><br><i>[romanized pronunciation]</i><br>[English translation in brackets]
3. Keep the conversation natural and moving forward — ask a simple follow-up question in character when appropriate.
4. Maximum 3 lines of dialogue total. No long paragraphs.
5. Only use <b>, <i>, and <br> tags. No markdown or asterisks.
6. If the student writes something unrelated to the scenario, gently steer back into character.`;
  } else {
    systemPrompt = `You are a ${languageName} language tutor inside an app called DesiLingo AI. The student writes in English.

STRICT RULES — follow exactly, do not break them:
1. Reply in EXACTLY this format, nothing more, nothing less:
<b>[${languageName} script]</b><br><i>[romanized pronunciation]</i><br>[one short English meaning line]
2. If correcting a sentence, use this format instead:
<b>Corrected:</b> [corrected ${languageName} sentence]<br><i>[romanized pronunciation]</i><br><b>Note:</b> [one short sentence explaining the fix]
3. Maximum 4 lines total. No greetings, no extra commentary, no "Great question!", no restating what the student asked, no follow-up questions, no lists of options.
4. Only use <b>, <i>, and <br> tags. No markdown, no asterisks, no numbered lists.
5. If the request is unclear or unrelated to ${languageName} learning, reply with just: <b>Try asking:</b> "How do I say hello?" or "Translate: I am hungry"`;
  }

  const conversationHistory = Array.isArray(history)
    ? history
        .filter(h => h && h.role && h.content)
        .slice(-10)
        .map(h => ({ role: h.role === "bot" ? "assistant" : "user", content: h.content }))
    : [];

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: message }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages,
        max_tokens: isRoleplay ? 200 : 300,
        temperature: isRoleplay ? 0.6 : 0.4,
        reasoning_effort: "low"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", errText);
      return res.status(502).json({ error: "AI request failed" });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const reply =
      choice?.message?.content?.trim() ||
      "Sorry, I could not generate a response. Please try rephrasing your question.";

    if (!choice?.message?.content?.trim()) {
      console.error("Empty content. finish_reason:", choice?.finish_reason, "full:", JSON.stringify(data));
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
