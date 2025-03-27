import React, { useState, KeyboardEvent } from "react";

interface ChatInputProps {
	onSendMessage: (message: string) => void;
	isLoading: boolean;
}

export default function ChatInput({
	onSendMessage,
	isLoading,
}: ChatInputProps) {
	const [message, setMessage] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim() && !isLoading) {
			onSendMessage(message);
			setMessage("");
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="input-container">
			<textarea
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
				disabled={isLoading}
				rows={1}
				className="flex-grow p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] resize-none min-h-[50px] max-h-[150px]"
				style={{ overflow: "auto" }}
			/>
			<button
				type="submit"
				disabled={isLoading || !message.trim()}
				className="gradient-bg text-white px-5 py-2 rounded-full disabled:opacity-50 h-[50px] min-w-[80px] font-medium transition-all hover:opacity-90 shadow-md"
			>
				{isLoading ? "Sending..." : "Send"}
			</button>
		</form>
	);
}
