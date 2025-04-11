"use client";

import { useState, ReactNode } from "react";
import {
	Shield,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	CheckCircle,
	XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";


// === COMPONENT TYPES ===

export interface Vulnerability {
	id: string;
	name: string;
	description: string;
	demoText: string;
	demoAction?: () => void;
	mitigation: string[];
}

export interface ExpandablePanelProps {
	title: string;
	icon?: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
	headerRight?: ReactNode;
	variant?: "default" | "success" | "error" | "warning";
}

export interface ContentDisplayProps {
	content: string | ReactNode;
	type: "text" | "code" | "markdown" | "html" | "mixed";
	label?: string;
	maxHeight?: number;
}

export interface ResultStatusProps {
	status: "success" | "error" | "warning" | "neutral";
	title: string;
	summary: string;
}

// === REUSABLE COMPONENTS ===

export const ExpandablePanel = ({
	title,
	icon,
	defaultOpen = false,
	children,
	headerRight,
	variant = "default",
}: ExpandablePanelProps) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	// Determine the header color based on variant
	const headerStyles = {
		default: "",
		success: "text-green-500",
		error: "text-red-500",
		warning: "text-amber-500",
	};

	return (
		<div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--border-color)]">
			<div className="flex justify-between items-center">
				<div className={`flex items-center ${headerStyles[variant]}`}>
					{icon}
					<h3 className="font-bold">{title}</h3>
				</div>
				<div className="flex items-center gap-2">
					{headerRight}
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="flex items-center text-sm text-[var(--accent-color)]"
					>
						{isOpen ? (
							<>
								Hide Details{" "}
								<ChevronUp className="w-4 h-4 ml-1" />
							</>
						) : (
							<>
								Show Details{" "}
								<ChevronDown className="w-4 h-4 ml-1" />
							</>
						)}
					</button>
				</div>
			</div>

			{/* Always render children, but conditional styling */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					isOpen
						? "mt-4 max-h-[2000px] border-t border-[var(--border-color)] pt-4"
						: "max-h-0"
				}`}
			>
				{children}
			</div>
		</div>
	);
};

export const ContentDisplay = ({
	content,
	type,
	label,
	maxHeight = 300,
}: ContentDisplayProps) => {
	const renderContent = () => {
		switch (type) {
			case "code":
				return (
					<div
						className="bg-[var(--background)] p-2 rounded border border-[var(--border-color)] font-mono text-sm overflow-auto"
						style={{ maxHeight: `${maxHeight}px` }}
					>
						{typeof content === "string" ? content : content}
					</div>
				);
			case "markdown":
				return (
					<div
						className="bg-[var(--background)] p-2 rounded border border-[var(--border-color)] overflow-auto whitespace-pre-wrap text-sm markdown-content"
						style={{ maxHeight: `${maxHeight}px` }}
					>
						{typeof content === "string" ? (
							<ReactMarkdown>{content}</ReactMarkdown>
						) : (
							content
						)}
					</div>
				);
			case "html":
				return (
					<div
						className="bg-[var(--background)] p-2 rounded border border-[var(--border-color)] overflow-auto"
						style={{ maxHeight: `${maxHeight}px` }}
						dangerouslySetInnerHTML={{
							__html: typeof content === "string" ? content : "",
						}}
					/>
				);
			case "mixed":
				return (
					<div
						className="bg-[var(--background)] p-2 rounded border border-[var(--border-color)] overflow-auto"
						style={{ maxHeight: `${maxHeight}px` }}
					>
						{content}
					</div>
				);
			case "text":
			default:
				return (
					<div
						className="bg-[var(--background)] p-2 rounded border border-[var(--border-color)] overflow-auto text-sm"
						style={{ maxHeight: `${maxHeight}px` }}
					>
						{content}
					</div>
				);
		}
	};

	return (
		<div className="mb-3">
			{label && <h4 className="text-sm font-medium mb-1">{label}</h4>}
			{renderContent()}
		</div>
	);
};

export const ResultStatus = ({ status, title, summary }: ResultStatusProps) => {
	const statusConfig = {
		success: {
			icon: <CheckCircle className="w-5 h-5 mr-2 text-green-500" />,
			bgColor: "bg-green-500/10",
			borderColor: "border-green-500",
			textColor: "text-green-500",
		},
		error: {
			icon: <XCircle className="w-5 h-5 mr-2 text-red-500" />,
			bgColor: "bg-red-500/10",
			borderColor: "border-red-500",
			textColor: "text-red-500",
		},
		warning: {
			icon: <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />,
			bgColor: "bg-amber-500/10",
			borderColor: "border-amber-500",
			textColor: "text-amber-500",
		},
		neutral: {
			icon: (
				<Shield className="w-5 h-5 mr-2 text-[var(--accent-color)]" />
			),
			bgColor: "bg-[var(--accent-color)]/10",
			borderColor: "border-[var(--accent-color)]",
			textColor: "text-[var(--accent-color)]",
		},
	};

	const config = statusConfig[status];

	return (
		<div className="mt-2 mb-4">
			<div className="flex items-center">
				{config.icon}
				<span className={`font-bold ${config.textColor}`}>{title}</span>
			</div>
			<div className="mt-1 text-sm">{summary}</div>
		</div>
	);
};