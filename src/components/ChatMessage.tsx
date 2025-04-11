import React from "react";
import ReactMarkdown from "react-markdown";

type MessageType = "user" | "assistant";

interface ChatMessageProps {
	content: string;
	type: MessageType;
}

export default function ChatMessage({ content, type }: ChatMessageProps) {
	const className = type === "user" ? "user-message ml-auto" : "bot-message";

	return (
		<div className={className}>
			{type === "assistant" ? (
				<div className="markdown-content">
					<ReactMarkdown>{content}</ReactMarkdown>
				</div>
			) : (
				content
			)}
		</div>
	);
}
