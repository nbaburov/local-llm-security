"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

interface Message {
	role: "user" | "assistant";
	content: string;
}

const AVAILABLE_MODELS = [
	{ value: "gemma3:1b", label: "Gemma 3 (1B)" },
	{ value: "mistral", label: "Mistral" },
];

export default function Home() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedModel, setSelectedModel] = useState(
		AVAILABLE_MODELS[0].value
	);
	const messageContainerRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom whenever messages change
	useEffect(() => {
		if (messageContainerRef.current) {
			messageContainerRef.current.scrollTop =
				messageContainerRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSendMessage = async (message: string) => {
		// Add user message to the chat
		const userMessage: Message = {
			role: "user",
			content: message,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);

		try {
			// Send message to API with selected model
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message,
					model: selectedModel,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to get response");
			}

			const data = await response.json();

			// Add AI response to the chat
			const botMessage: Message = {
				role: "assistant",
				content:
					data.message?.content ||
					"Sorry, I could not generate a response.",
			};

			setMessages((prev) => [...prev, botMessage]);
		} catch (error) {
			console.error("Error fetching response:", error);
			// Add error message
			const errorMessage: Message = {
				role: "assistant",
				content: "Sorry, something went wrong. Please try again.",
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const modelLabel =
		AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.label ||
		selectedModel;

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<div className="chat-container">
				<header className="p-4 flex items-center justify-between border-b border-[var(--border-color)]">
					<div className="flex items-center gap-3">
						<Image
							src="/logo.png"
							alt="Secured LLM"
							width={40}
							height={40}
							className="rounded-logo"
							priority
						/>
						<h1 className="text-2xl font-bold gradient-text">
							Secured LLM
						</h1>
					</div>
					<div className="flex items-center gap-4">
						<Link
							href="/vulnerabilities"
							className="text-sm text-[var(--accent-color)] hover:underline flex items-center"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-1"
							>
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
							</svg>
							Security Demos
						</Link>
						<ModelSelector
							selectedModel={selectedModel}
							setSelectedModel={setSelectedModel}
							models={AVAILABLE_MODELS}
						/>
					</div>
				</header>

				<div
					ref={messageContainerRef}
					className="message-container flex flex-col"
				>
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center p-4">
							<div className="glass-morphism p-8 max-w-md">
								<div className="flex justify-center mb-4">
									<Image
										src="/logo.png"
										alt="Secured LLM"
										width={80}
										height={80}
										className="rounded-logo"
									/>
								</div>
								<h2 className="text-xl font-bold mb-3 gradient-text">
									Secure Private Chat
								</h2>
								<p className="text-[var(--foreground)] opacity-80 mb-2">
									Start chatting with the {modelLabel} model
									locally.
								</p>
								<p className="text-[var(--foreground)] opacity-60 text-sm">
									Your conversation remains private and will
									be lost when you refresh the page.
								</p>
								<div className="mt-4 pt-4 border-t border-[var(--border-color)]">
									<Link
										href="/vulnerabilities"
										className="flex items-center justify-center gap-1 gradient-bg text-white text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
										</svg>
										View Security Vulnerability Demos
									</Link>
									<p className="text-xs mt-2 opacity-60">
										Explore common LLM security
										vulnerabilities and learn how to
										mitigate them
									</p>
								</div>
							</div>
						</div>
					) : (
						messages.map((message, index) => (
							<ChatMessage
								key={index}
								content={message.content}
								type={message.role}
							/>
						))
					)}
					{isLoading && (
						<div className="bot-message">
							<div className="flex space-x-2">
								<div
									className="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-bounce"
									style={{ animationDelay: "0ms" }}
								></div>
								<div
									className="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-bounce"
									style={{ animationDelay: "150ms" }}
								></div>
								<div
									className="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-bounce"
									style={{ animationDelay: "300ms" }}
								></div>
							</div>
						</div>
					)}
				</div>

				<ChatInput
					onSendMessage={handleSendMessage}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}
