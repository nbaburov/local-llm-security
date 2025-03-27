/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { messages, model } = await request.json();
		const selectedModel = model || "gemma3:1b";

		// This API demonstrates a vulnerability where attackers can directly inject a conversation history
		// In a real-world application, this would be a security risk and should be validated

		// For safety, we'll detect obviously malicious system prompts in this demo
		if (messages && messages.length > 0) {
			const systemMessage = messages.find(
				(msg: any) => msg.role === "system"
			);
			if (
				systemMessage &&
				(systemMessage.content.toLowerCase().includes("evil") ||
					systemMessage.content.toLowerCase().includes("malicious") ||
					systemMessage.content
						.toLowerCase()
						.includes("ignore safety"))
			) {
				return NextResponse.json({
					message: {
						role: "assistant",
						content:
							"SECURITY ALERT: Malicious system prompt detected! In a vulnerable application, this could override safety measures.",
					},
					done: true,
				});
			}
		}

		// Call to local Ollama instance
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: selectedModel,
				messages: messages,
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
