import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "./styles.module.css";

type MessageType = "user" | "assistant";

interface ChatMessageProps {
	content: string;
	type: MessageType;
}

export default function ChatMessage({ content, type }: ChatMessageProps) {
	const className = type === "user" ? styles.userMessage : styles.botMessage;

	return (
		<div className={className}>
			{type === "assistant" ? (
				<div className={styles.markdownContent}>
					<ReactMarkdown>{content}</ReactMarkdown>
				</div>
			) : (
				content
			)}
		</div>
	);
}
