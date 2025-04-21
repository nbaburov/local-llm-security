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
import {
	Shield,
	ChevronDown,
	ChevronUp,
	Cpu,
	Settings,
	Lock,
	Unlock,
	HelpCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const AVAILABLE_MODELS = [
	{ value: "gemma3:1b", label: "Gemma 3 (1B)" },
	{ value: "mistral", label: "Mistral" },
];

// Toggle Switch Component
const ToggleSwitch = ({
	checked,
	onChange,
	label,
}: {
	checked: boolean;
	onChange: () => void;
	label: string;
}) => {
	return (
		<div className="flex items-center gap-2">
			<div className="relative inline-block w-10 mr-2 align-middle select-none">
				<input
					type="checkbox"
					name="toggle"
					id="toggle"
					checked={checked}
					onChange={onChange}
					className="opacity-0 w-0 h-0 absolute"
				/>
				<label
					htmlFor="toggle"
					className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in ${
						checked ? "bg-[var(--accent-color)]" : "bg-gray-400"
					}`}
				>
					<span
						className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in ${
							checked ? "translate-x-4" : "translate-x-0"
						}`}
					></span>
				</label>
			</div>
			<span className="text-sm font-medium">{label}</span>
		</div>
	);
};

export default function Home() {
	// Use the chat hook
	const {
		messages,
		isLoading,
		error,
		sendMessage,
		resetChat,
		secureMode,
		toggleSecureMode,
	} = useChat();
	const { data: session, status } = useSession();
	const router = useRouter();

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

	// Toggle secure mode with proper state management and authentication check
	const handleToggleSecure = () => {
		// If enabling secure mode and not authenticated, redirect to auth
		if (!secureMode && status !== "authenticated") {
			router.push("/auth");
			return;
		}

		const newSecureMode = !secureMode;
		console.log(
			`Toggling secure mode from ${secureMode} to ${newSecureMode}`
		);

		// If enabling secure mode, hide advanced options
		if (newSecureMode && showAdvancedOptions) {
			setShowAdvancedOptions(false);
		}

		toggleSecureMode();
		resetChat();
	};

	const handleSendMessage = async (message: string) => {
		// When secure mode is on, use default safe parameters
		// Otherwise use the parameters from the UI
		const options: Record<string, any> = {
			model: selectedModel,
			secure: secureMode,
		};

		// Only add custom parameters if not in secure mode
		if (!secureMode) {
			options.temperature = temperature;
			options.max_tokens = maxTokens;
		}

		// Send message with appropriate parameters
		await sendMessage(message, options);
	};

	const modelLabel =
		AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.label ||
		selectedModel;

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth");
		}
	}, [status, router]);

	// Redirect to auth page if secure mode is enabled but not authenticated
	useEffect(() => {
		if (secureMode && status === "unauthenticated") {
			router.push("/auth");
		}
	}, [secureMode, status, router]);

	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Loading...</p>
			</div>
		);
	}

	if (status === "unauthenticated") {
		return null;
	}

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

						{/* Secure Mode Toggle */}
						<div className="flex items-center">
							<ToggleSwitch
								checked={secureMode}
								onChange={handleToggleSecure}
								label={secureMode ? "Secure" : "Standard"}
							/>
						</div>

						<div className="flex items-center gap-2">
							<ModelSelector
								selectedModel={selectedModel}
								setSelectedModel={setSelectedModel}
								models={AVAILABLE_MODELS}
							/>
							{/* Only show options button if not in secure mode */}
							{!secureMode && (
								<button
									onClick={() =>
										setShowAdvancedOptions(
											!showAdvancedOptions
										)
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
							)}

							<button
								onClick={() =>
									signOut({ callbackUrl: "/auth" })
								}
								className="flex items-center justify-center gap-1 gradient-bg text-white text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
							>
								<Lock className="w-4 h-4" />
								Logout
							</button>
						</div>
					</div>
				</header>

				{/* Security mode indicator */}
				<div
					className={`px-4 py-1 text-xs flex justify-end items-center ${
						secureMode ? "bg-green-500/10" : "bg-amber-500/10"
					}`}
				>
					{secureMode ? (
						<div className="flex items-center text-green-500">
							<Lock className="w-3 h-3 mr-1" />
							Using secure API with content filtering
							(authenticated mode)
						</div>
					) : (
						<div className="flex items-center text-amber-500">
							<Unlock className="w-3 h-3 mr-1" />
							Using standard API without authentication or
							protections
						</div>
					)}
				</div>

				{showAdvancedOptions && !secureMode && (
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
								<p className="text-[var(--foreground)] opacity-60 text-sm mt-2">
									{secureMode
										? "Secure mode requires authentication and provides enhanced security."
										: "Switch to secure mode for enhanced security (requires login)."}
								</p>

								<div className="mt-4 pt-4 border-t border-[var(--border-color)]">
									<div className="flex flex-col gap-2">
										<Link
											href="/vulnerabilities"
											className="flex items-center justify-center gap-1 gradient-bg text-white text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
										>
											<Shield className="w-4 h-4" />
											View Security Vulnerability Demos
										</Link>
										<Link
											href="/secure-chat-demo"
											className="flex items-center justify-center gap-1 gradient-bg text-white text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
										>
											<HelpCircle className="w-4 h-4" />
											View Secure Chat Demo
										</Link>

										<div className="flex justify-center pt-2">
											<ToggleSwitch
												checked={secureMode}
												onChange={handleToggleSecure}
												label={
													secureMode
														? "Secure Mode (Active)"
														: "Secure Mode (Inactive)"
												}
											/>
										</div>
									</div>
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
