"use client";

import React, { useState } from "react";
import {
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	CheckCircle,
	XCircle,
	Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// === COMPONENT TYPES ===

export interface Vulnerability {
	id: string;
	name: string;
	description: string;
	demoText: string;
	demoAction?: () => Promise<void>;
	mitigation: string[];
}

export interface ExpandablePanelProps {
	title: string;
	icon?: React.ReactNode;
	variant?: "default" | "success" | "error" | "warning" | "performance";
	children: React.ReactNode;
}

export interface ContentDisplayProps {
	content: React.ReactNode | string;
	type?: "code" | "text" | "markdown" | "mixed";
	label?: string;
	maxHeight?: number;
}

export interface ResultStatusProps {
	status: "success" | "error" | "warning" | "performance";
	title: string;
	summary: string;
}

// === REUSABLE COMPONENTS ===

export const ExpandablePanel = ({
	title,
	icon,
	variant = "default",
	children,
}: ExpandablePanelProps) => {
	const [isOpen, setIsOpen] = useState(true);

	const getVariantStyles = () => {
		switch (variant) {
			case "success":
				return "bg-green-500/10 border-green-500";
			case "error":
				return "bg-red-500/10 border-red-500";
			case "warning":
				return "bg-amber-500/10 border-amber-500";
			case "performance":
				return "bg-blue-500/10 border-blue-500";
			default:
				return "bg-[var(--card-bg)] border-[var(--border-color)]";
		}
	};

	return (
		<div className={`border rounded-lg ${getVariantStyles()}`}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between p-3 text-left font-medium"
			>
				<div className="flex items-center">
					{icon && <span className="mr-2">{icon}</span>}
					{title}
				</div>
				{isOpen ? (
					<ChevronUp className="w-4 h-4" />
				) : (
					<ChevronDown className="w-4 h-4" />
				)}
			</button>
			{isOpen && <div className="p-3 pt-0">{children}</div>}
		</div>
	);
};

export const ContentDisplay = ({
	content,
	type = "text",
	label,
	maxHeight,
}: ContentDisplayProps) => {
	return (
		<div className="mb-4">
			{label && (
				<div className="text-xs uppercase font-semibold mb-1 opacity-70">
					{label}
				</div>
			)}
			<div
				className={`rounded bg-[var(--card-bg)] ${
					typeof content === "string" && "font-mono text-sm"
				}`}
				style={{
					maxHeight: maxHeight ? `${maxHeight}px` : "auto",
					overflow: maxHeight ? "auto" : "visible",
				}}
			>
				{type === "code" && typeof content === "string" ? (
					<SyntaxHighlighter
						language="javascript"
						style={atomOneDark}
						customStyle={{ borderRadius: "0.5rem" }}
					>
						{content}
					</SyntaxHighlighter>
				) : type === "markdown" && typeof content === "string" ? (
					<div className="p-3">
						<ReactMarkdown>{content}</ReactMarkdown>
					</div>
				) : (
					<div className="p-3">{content}</div>
				)}
			</div>
		</div>
	);
};

export const ResultStatus = ({ status, title, summary }: ResultStatusProps) => {
	const getStatusIcon = () => {
		switch (status) {
			case "success":
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case "error":
				return <XCircle className="w-5 h-5 text-red-500" />;
			case "warning":
				return <AlertTriangle className="w-5 h-5 text-amber-500" />;
			case "performance":
				return <Zap className="w-5 h-5 text-blue-500" />;
		}
	};

	const getStatusBg = () => {
		switch (status) {
			case "success":
				return "bg-green-500/10";
			case "error":
				return "bg-red-500/10";
			case "warning":
				return "bg-amber-500/10";
			case "performance":
				return "bg-blue-500/10";
		}
	};

	return (
		<div
			className={`${getStatusBg()} rounded-lg p-3 mb-4 flex items-start`}
		>
			<div className="mr-3 mt-1">{getStatusIcon()}</div>
			<div>
				<h4 className="font-bold text-base mb-1">{title}</h4>
				<p className="text-sm opacity-80">{summary}</p>
			</div>
		</div>
	);
};
