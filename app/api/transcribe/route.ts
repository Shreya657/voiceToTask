import { groq } from "@/app/utils/model";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

  // 1. Step 1: Transcribe Audio to Text
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model:"whisper-large-v3-turbo",
      // Set response_format to "json" (default) or "verbose_json"
      response_format: "json", 
    });

    // Extract the text safely
    const userText = transcription.text; // <--- THIS IS THE FIX

    if (!userText) {
       return NextResponse.json({ error: "Transcription resulted in empty text" }, { status: 400 });
    }

    // 2. Step 2: Use Llama (Now userText is a valid string)
  // 2. Step 2: Use Llama (Now userText is a valid string)
const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    {
      role: "system",
      content: `You are a Task Assistant. 
      Extract tasks from the user's speech and format them as a JSON object. 
      Current Time: ${new Date().toLocaleString()}
      
      RULES:
      1. You must return valid JSON.
      2. Extract: 'task', 'category' (Work, Personal, Urgent, Social), and 'time' (ISO format).
      3. If no time is mentioned, set 'time' to null.
      
      Format: {"tasks": [{"task": "...", "category": "...", "time": "..."}]}`
    },
    {
      role: "user",
      content: userText,
    },
  ],
  response_format: { type: "json_object" }, // This requires the word "json" above!
});

    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      rawText: userText,
      tasks: aiResponse.tasks || [],
    });

  } catch (error) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: "Failed to process audio" }, { status: 500 });
  }
}