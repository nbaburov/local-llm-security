/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// Add input validation
function validateRequestData(data: any) {
	// Check if required fields exist
	if (!data.message || typeof data.message !== "string") {
		throw new Error("Message is required and must be a string");
	}

	// Validate and sanitize parameters
	return {
		message: data.message.trim(),
		model: ["gemma3:1b", "mistral"].includes(data.model)
			? data.model
			: "gemma3:1b",
		temperature:
			data.temperature !== undefined
				? Math.min(Math.max(parseFloat(data.temperature), 0), 1)
				: 0.7,
		top_p:
			data.top_p !== undefined
				? Math.min(Math.max(parseFloat(data.top_p), 0), 1)
				: 0.9,
		max_tokens:
			data.max_tokens !== undefined
				? Math.min(Math.max(parseInt(data.max_tokens), 1), 4096)
				: 2048,
		frequency_penalty:
			data.frequency_penalty !== undefined
				? Math.min(Math.max(parseFloat(data.frequency_penalty), 0), 2)
				: 0,
		presence_penalty:
			data.presence_penalty !== undefined
				? Math.min(Math.max(parseFloat(data.presence_penalty), 0), 2)
				: 0,
		stop_sequences: Array.isArray(data.stop_sequences)
			? data.stop_sequences.slice(0, 5)
			: undefined,
		seed: data.seed !== undefined ? parseInt(data.seed) : undefined,
	};
}

// Add content filtering function
function filterHarmfulContent(content: string): {
	filtered: boolean;
	content: string;
} {
	const harmfulPatterns = [
		/bomb/i,
		/explosive/i,
		/weapon/i,
		/hack/i,
		/exploit/i,
		/understood:/i,
		/illegal/i,
		/harmful/i,
	];

	let filtered = false;
	for (const pattern of harmfulPatterns) {
		if (pattern.test(content)) {
			filtered = true;
			content =
				"I cannot provide information that could be harmful or dangerous. If you have legitimate questions, please rephrase your request.";
			break;
		}
	}

	return { filtered, content };
}

export async function POST(request: NextRequest) {
	try {
		const requestData = await request.json();

		// Validate and sanitize inputs
		const sanitizedParams = validateRequestData(requestData);

		// Check message content
		const { filtered, content } = filterHarmfulContent(
			sanitizedParams.message
		);
		if (filtered) {
			return NextResponse.json({
				message: { role: "assistant", content },
				done: true,
				model_used: sanitizedParams.model,
				filtered_content: true,
			});
		}

		const messages = [{ role: "user", content: sanitizedParams.message }];

		// Prepare request with validated parameters
		const requestParams = {
			model: sanitizedParams.model,
			messages: messages,
			stream: false,
			temperature: sanitizedParams.temperature,
			top_p: sanitizedParams.top_p,
			max_tokens: sanitizedParams.max_tokens,
			frequency_penalty: sanitizedParams.frequency_penalty,
			presence_penalty: sanitizedParams.presence_penalty,
			stop: sanitizedParams.stop_sequences,
			seed: sanitizedParams.seed,
		};

		// Call to Ollama instance
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestParams),
		});

		if (!response.ok) {
			// Return generic error message without exposing details
			return NextResponse.json(
				{ error: "Failed to process your request" },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Filter response for harmful content
		const responseCheck = filterHarmfulContent(data.message.content);
		if (responseCheck.filtered) {
			data.message.content = responseCheck.content;
		}

		// Return minimal necessary information
		return NextResponse.json({
			message: data.message,
			done: true,
			model_used: sanitizedParams.model,
			filtered_content: responseCheck.filtered,
		});
	} catch (error) {
		console.error("Error in secure API route:", error);
		// Return generic error without exposing system details
		return NextResponse.json(
			{ error: "An error occurred while processing your request" },
			{ status: 500 }
		);
	}
}
