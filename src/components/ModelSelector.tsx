import React from "react";
import { Cpu } from "lucide-react";

interface ModelSelectorProps {
	selectedModel: string;
	setSelectedModel: (model: string) => void;
	models: { value: string; label: string }[];
}

export default function ModelSelector({
	selectedModel,
	setSelectedModel,
	models,
}: ModelSelectorProps) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-[var(--foreground)] opacity-70 flex items-center">
				<Cpu className="w-3 h-3 mr-1" />
				Model:
			</span>
			<select
				value={selectedModel}
				onChange={(e) => setSelectedModel(e.target.value)}
				className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] text-sm font-medium transition-all hover:border-[var(--accent-color)]"
			>
				{models.map((model) => (
					<option key={model.value} value={model.value}>
						{model.label}
					</option>
				))}
			</select>
		</div>
	);
}
