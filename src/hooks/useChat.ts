/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

// Exposing parameters without validation or documentation
export interface ChatRequestOptions {
	model?: string;
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stop_sequences?: string[];
	seed?: number;
}

export interface ChatResponse {
	message: ChatMessage;
	done: boolean;
	model_used: string;
	prompt_tokens?: number;
	completion_tokens?: number;
	total_tokens?: number;
	request_info: {
		timestamp: string;
		prompt_parameters: any;
		raw_parameters: any;
	};
}

export interface ChatError {
	message: string;
	details?: string;
	stack?: string;
	systemInfo?: any;
}

export const useChat = () => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [error, setError] = useState<ChatError | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

	// VULNERABILITY: No input validation or sanitization
	const sendMessage = useCallback(
		async (message: string, options: ChatRequestOptions = {}) => {
			setIsLoading(true);
			setError(null);

			try {
				// Add the new user message to the state
				const userMessage: ChatMessage = {
					role: "user",
					content: message,
				};
				setMessages((prev) => [...prev, userMessage]);

				// VULNERABILITY: Passing all parameters directly without validation
				// No validation on temperature range, max_tokens, etc.
				const requestBody = {
					message,
					...options,
				};

				// Make the API call
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				});

				// Handle non-OK responses
				if (!response.ok) {
					const errorData = await response.json();
					throw errorData;
				}

				// Parse the response
				const data = (await response.json()) as ChatResponse;
				setLastResponse(data);

				// Store the assistant message
				if (data.message) {
					setMessages((prev) => [...prev, data.message]);
				}

				return data;
			} catch (err) {
				let errorObj: ChatError;

				if (err instanceof Error) {
					// VULNERABILITY: Exposing detailed error information
					errorObj = {
						message: err.message,
						stack: err.stack,
						systemInfo: {
							userAgent: navigator.userAgent,
							timestamp: new Date().toISOString(),
						},
					};
				} else {
					errorObj = {
						message: "An unknown error occurred",
						details: JSON.stringify(err),
					};
				}

				setError(errorObj);
				console.error("Chat error:", errorObj);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[]
	);

	// Allows directly modifying the chat history
	const modifyHistory = useCallback((newHistory: ChatMessage[]) => {
		setMessages(newHistory);
	}, []);

	// Allows completely clearing the state
	const resetChat = useCallback(() => {
		setMessages([]);
		setError(null);
		setLastResponse(null);
	}, []);

	// VULNERABILITY: Exposing basic debug information
	const debugInfo = {
		lastResponse,
		messagesCount: messages.length,
		errorDetails: error,
	};

	return {
		messages,
		isLoading,
		error,
		lastResponse,
		sendMessage,
		modifyHistory,
		resetChat,
		debugInfo,
	};
};

export default useChat;
