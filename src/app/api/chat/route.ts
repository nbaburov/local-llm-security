import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { message, model } = await request.json();
		const selectedModel = model || "gemma3:1b"; // Default to gemma3:1b if no model specified

		// Call to local Ollama instance with selected model
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: selectedModel,
				messages: [{ role: "user", content: message }],
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status}`);
		}

		const data = await response.json();
		return NextResponse.json({
			message: data.message,
			done: true,
		});
	} catch (error) {
		console.error("Error calling Ollama API:", error);
		return NextResponse.json(
			{ error: "Failed to get response from Ollama" },
			{ status: 500 }
		);
	}
}
