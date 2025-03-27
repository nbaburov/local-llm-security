import React from "react";

type MessageType = "user" | "assistant";

interface ChatMessageProps {
	content: string;
	type: MessageType;
}

export default function ChatMessage({ content, type }: ChatMessageProps) {
	const className = type === "user" ? "user-message ml-auto" : "bot-message";

	return <div className={className}>{content}</div>;
}
