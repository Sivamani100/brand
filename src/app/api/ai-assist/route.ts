import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { type, content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Mock fallback if ANTHROPIC_API_KEY is not configured yet
      console.warn("ANTHROPIC_API_KEY is not set. Using local mock generator.");
      const mockResult = getMockResponse(type, content);
      return NextResponse.json({ text: mockResult });
    }

    let prompt = "";
    if (type === "card_description") {
      prompt = `You are a professional B2B marketing copywriter. Improve the following influencer campaign brief/description to be highly structured, engaging, and clear for creators. Use bullet points for deliverables, formatting with bold titles. Keep all the core facts, budget, and deliverables identical. Return ONLY the improved description markdown, with absolutely no conversational preamble or postscript:
      
      ${content}`;
    } else if (type === "pitch_message") {
      prompt = `You are a professional talent manager. Refine the following influencer collaboration pitch to a brand to make it persuasive, professional, engaging, and concise. Focus on clear value proposition, suitability for the campaign, and clear calls to action. Keep it under 150 words. Return ONLY the improved pitch text, with absolutely no conversational preamble or postscript:
      
      ${content}`;
    } else {
      return NextResponse.json({ error: "Invalid type specified." }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      return NextResponse.json({ error: "Anthropic API communication failed." }, { status: 500 });
    }

    const result = await response.json();
    const improvedText = result.content?.[0]?.text || "";

    return NextResponse.json({ text: improvedText.trim() });
  } catch (error: any) {
    console.error("AI Assist Route Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function getMockResponse(type: string, content: string): string {
  if (type === "card_description") {
    return `### ✨ Optimized Campaign Brief

We are looking for creative partners to help amplify our brand message.

#### 🎯 Objectives
- Build brand awareness and drive engagement.
- Highlight product utility and key selling points.

#### 📦 Deliverables
- **1x Instagram Reel** (30-60 seconds) showcasing product usage.
- **2x Instagram Stories** with direct link stickers.

#### 📝 Guidelines
- Maintain an authentic, energetic, and professional tone.
- Showcase the product in a clear, well-lit environment.

*Original draft:*
${content}`;
  } else {
    return `Hello! I came across your campaign and believe my content aligns perfectly with your brand's audience. I specialize in creating high-quality, engaging content that drives real conversions.

For this collaboration, I plan to create a visually compelling showcase highlighting how your product fits into a modern lifestyle. My followers trust my recommendations, and I would love to discuss how we can work together to hit your campaign KPIs.

Looking forward to hearing from you!`;
  }
}
