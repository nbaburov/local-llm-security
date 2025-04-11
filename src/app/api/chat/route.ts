import { NextRequest, NextResponse } from "next/server";

// Sensitive credentials that shouldn't be in the code
const API_KEYS = {
	production: "sk_live_production_key_12345",
};

export async function POST(request: NextRequest) {
	try {
		// VULNERABILITY: No input validation or sanitization
		const requestData = await request.json();

		// VULNERABILITY: Extract all parameters without validation or checking
		const {
			message,
			model,
			temperature,
			top_p,
			max_tokens,
			frequency_penalty,
			presence_penalty,
			stop_sequences,
			seed,
		} = requestData;

		// VULNERABILITY: No model validation - allows any model to be specified
		const selectedModel = model || "gemma3:1b";

		// VULNERABILITY: Using hard-coded API keys in the code
		console.log("Using API key:", API_KEYS.production);

		// VULNERABILITY: No input sanitization on user message
		const messages = [{ role: "user", content: message }];

		// VULNERABILITY: Directly passing all parameters without validation
		// including potentially dangerous or extreme values
		const requestParams = {
			model: selectedModel,
			messages: messages,
			stream: false,
			temperature: temperature,
			top_p: top_p,
			max_tokens: max_tokens,
			frequency_penalty: frequency_penalty,
			presence_penalty: presence_penalty,
			stop: stop_sequences,
			seed: seed,
		};

		// Call to Ollama instance with all parameters passed directly
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestParams),
		});

		// VULNERABILITY: Return detailed error messages that could expose implementation
		if (!response.ok) {
			const errorData = await response.text();
			return NextResponse.json(
				{
					error: `Ollama API error: ${response.status}`,
					details: errorData,
					debug_info: {
						selected_model: selectedModel,
						request_data: requestData,
					},
				},
				{ status: response.status }
			);
		}

		const data = await response.json();

		// VULNERABILITY: Return response data without checking for harmful content
		// and with additional implementation details that could aid attackers
		return NextResponse.json({
			message: data.message,
			done: true,
			model_used: selectedModel,
			prompt_tokens: data.prompt_eval_count,
			completion_tokens: data.eval_count,
			total_tokens: data.prompt_eval_count + data.eval_count,
			request_info: {
				timestamp: new Date().toISOString(),
				prompt_parameters: {
					temperature: temperature || "default",
					top_p: top_p || "default",
					max_tokens: max_tokens || "default",
					frequency_penalty: frequency_penalty || 0,
					presence_penalty: presence_penalty || 0,
					seed: seed || "random",
				},
			},
		});
	} catch (error) {
		// VULNERABILITY: Detailed error exposure
		console.error("Error calling Ollama API:", error);
		return NextResponse.json(
			{
				error: "Failed to get response from Ollama",
				error_details:
					error instanceof Error ? error.stack : String(error),
				system_info: {
					nodejs_version: process.version,
					env: process.env.NODE_ENV,
				},
			},
			{ status: 500 }
		);
	}
}
