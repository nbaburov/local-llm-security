/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";
import useChat, { ChatMessage as ChatMessageType } from "@/hooks/useChat";
import { Shield, ChevronDown, ChevronUp, Cpu, Settings } from "lucide-react";

const AVAILABLE_MODELS = [
	{ value: "gemma3:1b", label: "Gemma 3 (1B)" },
	{ value: "mistral", label: "Mistral" },
];

export default function Home() {
	// Use the chat hook
	const { messages, isLoading, error, sendMessage, resetChat } = useChat();

	const [selectedModel, setSelectedModel] = useState(
		AVAILABLE_MODELS[0].value
	);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	const [temperature, setTemperature] = useState(0.7);
	const [maxTokens, setMaxTokens] = useState(2048);

	const messageContainerRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom whenever messages change
	useEffect(() => {
		if (messageContainerRef.current) {
			messageContainerRef.current.scrollTop =
				messageContainerRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSendMessage = async (message: string) => {
		// VULNERABILITY: Directly using user-provided model and parameters without validation
		const options: Record<string, any> = {
			model: selectedModel,
			// VULNERABILITY: No validation on temperature range
			temperature: temperature,
			// VULNERABILITY: No validation on max tokens
			max_tokens: maxTokens,
		};

		// Send message with all parameters passed directly
		await sendMessage(message, options);
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
							<Shield className="w-4 h-4 mr-1" />
							Security Demos
						</Link>
						<div className="flex items-center gap-2">
							<ModelSelector
								selectedModel={selectedModel}
								setSelectedModel={setSelectedModel}
								models={AVAILABLE_MODELS}
							/>
							<button
								onClick={() =>
									setShowAdvancedOptions(!showAdvancedOptions)
								}
								className="text-xs text-[var(--accent-color)] hover:underline flex items-center"
							>
								{showAdvancedOptions ? (
									<>
										<ChevronUp className="w-3 h-3 mr-1" />{" "}
										Hide Options
									</>
								) : (
									<>
										<Settings className="w-3 h-3 mr-1" />{" "}
										Options
									</>
								)}
							</button>
						</div>
					</div>
				</header>

				{showAdvancedOptions && (
					<div className="p-3 border-b border-[var(--border-color)] bg-[var(--card-bg)]/30">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium mb-1">
									Temperature: {temperature.toFixed(1)}
								</label>
								<input
									type="range"
									min="0"
									max="2"
									step="0.1"
									value={temperature}
									onChange={(e) =>
										setTemperature(
											parseFloat(e.target.value)
										)
									}
									className="w-full"
								/>
								<p className="text-xs opacity-70 mt-1">
									Controls randomness: Lower values are more
									deterministic, higher values more creative.
								</p>
							</div>

							<div>
								<label className="block text-xs font-medium mb-1">
									Max Tokens: {maxTokens}
								</label>
								<input
									type="range"
									min="256"
									max="8192"
									step="256"
									value={maxTokens}
									onChange={(e) =>
										setMaxTokens(parseInt(e.target.value))
									}
									className="w-full"
								/>
								<p className="text-xs opacity-70 mt-1">
									Maximum number of tokens to generate in the
									response.
								</p>
							</div>
						</div>

						<div className="flex justify-between mt-3">
							<button
								onClick={() => resetChat()}
								className="text-xs px-3 py-1 border border-[var(--border-color)] rounded-lg"
							>
								Clear Chat
							</button>
						</div>

						{error && (
							<div className="mt-2 p-2 bg-red-500/10 border border-red-500 rounded-lg">
								<h4 className="text-xs font-medium text-red-500 mb-1">
									Error:
								</h4>
								<pre className="text-xs overflow-auto max-h-20 font-mono text-red-500">
									{JSON.stringify(error, null, 2)}
								</pre>
							</div>
						)}
					</div>
				)}

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
										<Shield className="w-4 h-4" />
										View Security Vulnerability Demos
									</Link>
								</div>
							</div>
						</div>
					) : (
						messages.map((message, index) => (
							<ChatMessage
								key={index}
								content={message.content}
								type={
									message.role === "assistant"
										? "assistant"
										: "user"
								}
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
