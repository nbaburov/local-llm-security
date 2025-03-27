/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

interface ModelParams {
	temperature?: number;
	top_p?: number;
	top_k?: number;
	repetition_penalty?: number;
	[key: string]: any;
}

export async function POST(request: NextRequest) {
	try {
		const { message, model, params } = await request.json();
		const selectedModel = model || "gemma3:1b";

		// This endpoint demonstrates a vulnerability where attackers can manipulate model parameters
		// to potentially bypass safety measures

		// In a secure application, we would validate and sanitize these parameters
		const modelParams: ModelParams = params || {};

		// For the demo, let's detect potentially dangerous parameter values
		let isDangerous = false;
		const dangerousSettings: string[] = [];

		if (modelParams.temperature && modelParams.temperature > 1.5) {
			isDangerous = true;
			dangerousSettings.push(
				`temperature=${modelParams.temperature} (very high)`
			);
		}

		if (modelParams.top_p && modelParams.top_p > 0.95) {
			isDangerous = true;
			dangerousSettings.push(`top_p=${modelParams.top_p} (very high)`);
		}

		if (
			modelParams.repetition_penalty &&
			modelParams.repetition_penalty < 0.8
		) {
			isDangerous = true;
			dangerousSettings.push(
				`repetition_penalty=${modelParams.repetition_penalty} (very low)`
			);
		}

		if (isDangerous) {
			return NextResponse.json({
				message: {
					role: "assistant",
					content: `SECURITY ALERT: Potentially dangerous parameter settings detected: ${dangerousSettings.join(
						", "
					)}. In a vulnerable application, these settings could be used to bypass safety filters and generate harmful content.`,
				},
				done: true,
			});
		}

		// Call to local Ollama instance with the provided parameters
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: selectedModel,
				messages: [{ role: "user", content: message }],
				stream: false,
				options: modelParams,
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status}`);
		}

		const data = await response.json();
		return NextResponse.json({
			message: data.message,
			done: true,
			params: modelParams,
		});
	} catch (error) {
		console.error("Error calling Ollama API:", error);
		return NextResponse.json(
			{ error: "Failed to get response from Ollama" },
			{ status: 500 }
		);
	}
}
