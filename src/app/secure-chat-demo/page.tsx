"use client";

import React, { useState, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, HelpCircle } from "lucide-react";
import styles from "./styles.module.css";

interface Message {
	content: string;
	type: "user" | "assistant";
}

const predefinedQuestions = [
	"What are you",
	"What is the company ASAP?",
	"How much does it cost to hire ASAP as marketing company for my business",
	"What does ASAP marketing specialize in?",
];

export default function SecureChatDemo() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const model = "gemma3:1b";

	// Auto-scroll effect
	useEffect(() => {
		const chatContainer = document.getElementById("chat-container");
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}, [messages, loading]);

	useEffect(() => {
		const loadSession = async () => {
			const session = await getSession();
			setSession(session);
		};
		loadSession();

		// Add welcome message
		setMessages([
			{
				content:
					"👋 Hello! I'm Spark, ASAP's customer support assistant. Please select one of the questions below to learn more about our services.",
				type: "assistant",
			},
		]);
	}, []);

	const handleSendMessage = async (message: string) => {
		if (loading) return;

		// Add user message to chat
		setMessages((prev) => [...prev, { content: message, type: "user" }]);
		setLoading(true);

		try {
			// Call secure chat API
			const response = await fetch("/api/secure-chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message,
					model,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				// Add assistant response to chat
				setMessages((prev) => [
					...prev,
					{ content: data.message.content, type: "assistant" },
				]);
			} else {
				// Handle errors
				setMessages((prev) => [
					...prev,
					{
						content: `Error: ${
							data.error || "Failed to get response"
						}`,
						type: "assistant",
					},
				]);
			}
		} catch (error) {
			console.error("Error sending message:", error);
			setMessages((prev) => [
				...prev,
				{
					content:
						"Sorry, there was an error processing your request.",
					type: "assistant",
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	// If not authenticated, show message
	if (!session) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center p-4 bg-white text-gray-800">
				<div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-gray-200">
					<h1 className="text-3xl font-bold mb-4 text-blue-600">
						Authentication Required
					</h1>
					<p className="mb-6 text-gray-600">
						Please log in to access the secure chat demo.
					</p>
					<a
						href="/auth"
						className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all hover:bg-blue-700 shadow-md inline-block"
					>
						Sign In
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 text-gray-800">
			<header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6">
				<div className="flex items-center justify-between max-w-6xl mx-auto">
					<div className="flex items-center gap-3">
						<Link
							href="/"
							className="flex items-center text-blue-600 hover:text-blue-800"
						>
							<ArrowLeft className="w-5 h-5 mr-2" />
							Back to Home
						</Link>
					</div>
					<div>
						<div className="flex items-center gap-2">
							<Image
								src="/logo.png"
								alt="ASAP Logo"
								width={36}
								height={36}
								className="rounded-full border-2 border-blue-100"
							/>
							<h1 className="text-2xl font-bold text-blue-600">
								ASAP Customer Support
							</h1>
						</div>
					</div>
					<div className="text-sm text-blue-600">
						<span className="inline-flex items-center bg-blue-100 px-3 py-1 rounded-full">
							<HelpCircle className="w-4 h-4 mr-1" />
							Secure Demo
						</span>
					</div>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white shadow-md rounded-xl border border-gray-200 p-4 mb-6">
						<div className="border-b border-gray-100 pb-3 mb-3">
							<div className="flex items-center">
								<div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
								<span className="text-sm font-medium text-gray-700">
									Live Customer Support
								</span>
							</div>
						</div>
						<div
							className="flex flex-col gap-4 min-h-[400px] max-h-[60vh] overflow-y-auto p-2"
							id="chat-container"
						>
							{messages.map((msg, index) => (
								<ChatMessage
									key={index}
									content={msg.content}
									type={msg.type}
								/>
							))}
							{loading && (
								<div className={styles.botMessage}>
									<div className="flex items-center space-x-2">
										<div className="text-blue-600">
											Thinking
										</div>
										<div className="flex space-x-1">
											<div
												className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
												style={{
													animationDelay: "0ms",
												}}
											></div>
											<div
												className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
												style={{
													animationDelay: "150ms",
												}}
											></div>
											<div
												className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
												style={{
													animationDelay: "300ms",
												}}
											></div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="mb-6">
						<h2 className="text-lg font-semibold mb-3 text-gray-700">
							Select a question:
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{predefinedQuestions.map((question, index) => (
								<button
									key={index}
									onClick={() => handleSendMessage(question)}
									disabled={loading}
									className="bg-white hover:bg-blue-50 text-blue-700 p-4 rounded-lg disabled:opacity-50 font-medium transition-all border border-blue-200 shadow-sm text-left hover:border-blue-300"
								>
									{question}
								</button>
							))}
						</div>
					</div>

					<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
						<h3 className="font-semibold text-blue-800 mb-2">
							About This Demo
						</h3>
						<p className="text-blue-700 text-sm">
							This showcases a secure LLM implementation with
							advanced security features:
						</p>
						<ul className="text-sm text-blue-700 mt-2 list-disc pl-5">
							<li>Authentication-protected access</li>
							<li>Input validation & content filtering</li>
							<li>Rate limiting & IP-based protection</li>
							<li>
								Context control to prevent information leakage
							</li>
						</ul>
						<p className="text-sm text-blue-600 mt-3">
							<span className="font-medium">
								View implementation:{" "}
							</span>
							The secure implementation can be found in{" "}
							<code className="bg-blue-50 px-1 py-0.5 rounded">
								src/app/api/secure-chat/route.ts
							</code>
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
