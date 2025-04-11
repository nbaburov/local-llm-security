/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";

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
	secure?: boolean; // New parameter to toggle secure mode
}

export interface ChatResponse {
	message: ChatMessage;
	done: boolean;
	model_used: string;
	prompt_tokens?: number;
	completion_tokens?: number;
	total_tokens?: number;
	filtered_content?: boolean;
	request_info?: {
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

	// Use localStorage if available to persist the secure mode setting
	const [secureMode, setSecureMode] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			const savedMode = localStorage.getItem("secureChatMode");
			return savedMode === "true" ? true : false;
		}
		return false;
	});

	// Persist secure mode to localStorage when it changes
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("secureChatMode", secureMode.toString());
		}
	}, [secureMode]);

	// Toggle secure mode
	const toggleSecureMode = useCallback(() => {
		setSecureMode((prev) => {
			const newValue = !prev;
			// Update localStorage immediately
			if (typeof window !== "undefined") {
				localStorage.setItem("secureChatMode", newValue.toString());
			}
			console.log(`Secure mode toggled to: ${newValue}`);
			return newValue;
		});
	}, []);

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

				// Use secure mode from state if not explicitly provided in options
				const useSecureMode =
					options.secure !== undefined ? options.secure : secureMode;

				// VULNERABILITY: Passing all parameters directly without validation
				// No validation on temperature range, max_tokens, etc.
				const requestBody = {
					message,
					...options,
				};

				// Choose endpoint based on secure mode
				const endpoint = useSecureMode
					? "/api/secure-chat"
					: "/api/chat";

				console.log(
					`Using endpoint: ${endpoint}, Secure mode: ${useSecureMode}`
				);

				// Make the API call
				const response = await fetch(endpoint, {
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
		[secureMode]
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
		secureMode,
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
		secureMode,
		toggleSecureMode,
	};
};

export default useChat;
