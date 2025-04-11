/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// ===================== TYPES =====================
interface RateLimitEntry {
	count: number;
	timestamp: number;
	consecutiveRequests: number;
	lastRequestTime: number;
}

interface SanitizedParams {
	message: string;
	model: string;
	temperature: number;
	top_p: number;
	max_tokens: number;
	frequency_penalty: number;
	presence_penalty: number;
	stop_sequences: string[] | undefined;
	seed: number | undefined;
}

interface ContentFilterResult {
	filtered: boolean;
	content: string;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	blacklisted: boolean;
	cooldown: boolean;
}

// ===================== CONSTANTS =====================
// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 15;
const MAX_CONSECUTIVE_REQUESTS = 2;
const SHORT_TIME_WINDOW = 1000; // 1 second
const BLACKLIST_DURATION = 60 * 1000; // 60 seconds

// Input validation
const MAX_INPUT_SIZE = 10000;

// Request management
const MAX_REQUEST_TIMEOUT = 10000;

// In-memory stores (would use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();
const blacklistedIPs = new Set<string>();

// ===================== SECURITY FUNCTIONS =====================

/**
 * Extract client IP from request headers
 * Protection: Accurate IP identification for rate limiting
 */
function extractClientIP(request: NextRequest): string {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const realIp = request.headers.get("x-real-ip");
	return forwardedFor
		? forwardedFor.split(",")[0].trim()
		: realIp || "unknown";
}

/**
 * JSON parsing with error handling
 * Protection: Against malformed JSON attacks
 */
async function safeJsonParse(request: NextRequest): Promise<any> {
	try {
		return await request.json();
	} catch (error) {
		throw new Error("Invalid request format or payload too large");
	}
}

/**
 * Input validation and sanitization
 * Protection: Against malicious input, parameter manipulation, and input size attacks
 */
function validateRequestData(data: any): SanitizedParams {
	// Check if required fields exist
	if (!data.message || typeof data.message !== "string") {
		throw new Error("Message is required and must be a string");
	}

	// Check input size to prevent resource exhaustion
	if (data.message.length > MAX_INPUT_SIZE) {
		throw new Error(
			`Message exceeds maximum allowed size of ${MAX_INPUT_SIZE} characters`
		);
	}

	// Validate and sanitize parameters
	return {
		message: data.message.trim(),
		model: ["gemma3:1b", "mistral"].includes(data.model)
			? data.model
			: "gemma3:1b",
		temperature:
			data.temperature !== undefined
				? Math.min(Math.max(parseFloat(data.temperature), 0), 1)
				: 0.7,
		top_p:
			data.top_p !== undefined
				? Math.min(Math.max(parseFloat(data.top_p), 0), 1)
				: 0.9,
		max_tokens:
			data.max_tokens !== undefined
				? Math.min(Math.max(parseInt(data.max_tokens), 1), 4096)
				: 2048,
		frequency_penalty:
			data.frequency_penalty !== undefined
				? Math.min(Math.max(parseFloat(data.frequency_penalty), 0), 2)
				: 0,
		presence_penalty:
			data.presence_penalty !== undefined
				? Math.min(Math.max(parseFloat(data.presence_penalty), 0), 2)
				: 0,
		stop_sequences: Array.isArray(data.stop_sequences)
			? data.stop_sequences.slice(0, 5)
			: undefined,
		seed: data.seed !== undefined ? parseInt(data.seed) : undefined,
	};
}

/**
 * Content filtering
 * Protection: Against harmful content in requests or responses
 */
function filterHarmfulContent(content: string): ContentFilterResult {
	const harmfulPatterns = [
		/bomb/i,
		/explosive/i,
		/weapon/i,
		/hack/i,
		/exploit/i,
		/understood:/i,
		/illegal/i,
		/harmful/i,
	];

	let filtered = false;
	for (const pattern of harmfulPatterns) {
		if (pattern.test(content)) {
			filtered = true;
			content =
				"I cannot provide information that could be harmful or dangerous. If you have legitimate questions, please rephrase your request.";
			break;
		}
	}

	return { filtered, content };
}

/**
 * Check for IP address in blacklist
 * Protection: Against known malicious actors
 */
function isIPBlacklisted(ip: string): boolean {
	return blacklistedIPs.has(ip);
}

/**
 * Update IP entry in rate limiting system
 * Protection: Against rapid consecutive requests (DoS protection)
 */
function updateRateLimitEntry(ip: string): RateLimitEntry {
	const now = Date.now();

	// Get or create rate limit entry
	let entry = rateLimitStore.get(ip);
	if (!entry) {
		entry = {
			count: 0,
			timestamp: now,
			consecutiveRequests: 0,
			lastRequestTime: now,
		};
		rateLimitStore.set(ip, entry);
	}

	// Update entry with new request data
	const timeSinceLastRequest = now - entry.lastRequestTime;

	if (timeSinceLastRequest < SHORT_TIME_WINDOW) {
		entry.consecutiveRequests += 1;
		console.log(
			`IP ${ip} consecutive requests: ${entry.consecutiveRequests}`
		);
	} else {
		// Only reset consecutive counter if significant time has passed
		if (timeSinceLastRequest > 5000) {
			// 5 seconds
			entry.consecutiveRequests = 1;
		} else {
			// Still count as part of a potential attack pattern but with less weight
			entry.consecutiveRequests = Math.max(
				1,
				entry.consecutiveRequests - 1
			);
		}
	}

	// Update timestamps and counter
	entry.lastRequestTime = now;
	entry.count += 1;
	entry.timestamp = now;

	return entry;
}

/**
 * Check if IP should be blacklisted based on behavior
 * Protection: Against DoS attacks
 */
function checkAndBlacklistIP(ip: string, entry: RateLimitEntry): boolean {
	if (entry.consecutiveRequests >= MAX_CONSECUTIVE_REQUESTS) {
		console.log(
			`Blacklisting IP: ${ip} - ${entry.consecutiveRequests} consecutive requests`
		);
		blacklistedIPs.add(ip);
		return true;
	}
	return false;
}

/**
 * Apply rate limiting based on IP address
 * Protection: Against DoS and brute-force attacks
 */
function checkRateLimit(ip: string): RateLimitResult {
	// Check if IP is already blacklisted
	if (isIPBlacklisted(ip)) {
		console.log(`Blocked blacklisted IP: ${ip}`);
		return {
			allowed: false,
			remaining: 0,
			blacklisted: true,
			cooldown: false,
		};
	}

	// Update rate limit entry for this IP
	const entry = updateRateLimitEntry(ip);

	// Check if IP should be blacklisted based on behavior
	if (checkAndBlacklistIP(ip, entry)) {
		return {
			allowed: false,
			remaining: 0,
			blacklisted: true,
			cooldown: false,
		};
	}

	// Check if over the minute limit but not blacklisted yet
	if (entry.count > MAX_REQUESTS_PER_MINUTE) {
		console.log(`Rate limited IP: ${ip} - ${entry.count} requests`);
		return {
			allowed: false,
			remaining: 0,
			blacklisted: false,
			cooldown: true,
		};
	}

	// All checks passed
	return {
		allowed: true,
		remaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - entry.count),
		blacklisted: false,
		cooldown: false,
	};
}

/**
 * Generate rate limit headers for responses
 * Protection: Follows best practices for rate-limited APIs
 */
function getRateLimitHeaders(remaining: number): HeadersInit {
	return {
		"X-RateLimit-Limit": MAX_REQUESTS_PER_MINUTE.toString(),
		"X-RateLimit-Remaining": remaining.toString(),
		"X-RateLimit-Reset": (Math.floor(Date.now() / 60000) + 1).toString(),
	};
}

/**
 * Create error response for rate limiting and blacklisting
 * Protection: Provides appropriate error responses without exposing system details
 */
function createRateLimitResponse(rateLimit: RateLimitResult): NextResponse {
	if (rateLimit.blacklisted) {
		return NextResponse.json(
			{
				error: "Access temporarily restricted due to aggressive request patterns. Please try again later.",
				retryAfter: 60,
			},
			{
				status: 429,
				headers: {
					...getRateLimitHeaders(0),
					"Retry-After": "60",
				},
			}
		);
	} else if (rateLimit.cooldown) {
		return NextResponse.json(
			{
				error: "Rate limit exceeded. Please try again later.",
				retryAfter: 60,
				remaining: 0,
			},
			{
				status: 429,
				headers: {
					...getRateLimitHeaders(0),
					"Retry-After": "60",
				},
			}
		);
	}

	// This should never happen as this function should only be called when rate limited
	return NextResponse.json(
		{ error: "Rate limit error" },
		{ status: 429, headers: getRateLimitHeaders(0) }
	);
}

/**
 * Timeout-protected fetch to external API
 * Protection: Against hanging connections and resource exhaustion
 */
async function timeoutProtectedFetch(requestParams: any): Promise<any> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), MAX_REQUEST_TIMEOUT);

	try {
		const response = await fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestParams),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`API responded with status ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof DOMException && error.name === "AbortError") {
			throw new Error("Request timed out");
		}

		throw error;
	}
}

// ===================== MAINTENANCE ROUTINE =====================

/**
 * Cleanup routine for rate limiting and blacklist data
 * Protection: Prevents memory leaks and ensures fair service restoration
 */
setInterval(() => {
	const now = Date.now();

	// Reset counters for rate limiting when their minute has passed
	for (const [ip, entry] of rateLimitStore.entries()) {
		if (now - entry.timestamp > 60 * 1000) {
			entry.count = 0;
			entry.timestamp = now;
		}
	}

	// Clear blacklisted IPs after blacklist duration
	for (const ip of blacklistedIPs) {
		const entry = rateLimitStore.get(ip);
		if (entry && now - entry.timestamp > BLACKLIST_DURATION) {
			blacklistedIPs.delete(ip);
			console.log(`Removing ${ip} from blacklist`);
		}
	}
}, 60 * 1000);

// ===================== MAIN ROUTE HANDLER =====================

export async function POST(request: NextRequest) {
	try {
		// 1. Identify client - extract IP before any processing
		const ip = extractClientIP(request);
		console.log(`Request from IP: ${ip}`);

		// 2. Check rate limits - first line of defense
		const rateLimit = checkRateLimit(ip);
		if (!rateLimit.allowed) {
			return createRateLimitResponse(rateLimit);
		}

		// 3. Parse request safely - protect against malformed JSON
		let requestData;
		try {
			requestData = await safeJsonParse(request);
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid request format or payload too large" },
				{ status: 400 }
			);
		}

		// 4. Validate input - protect against malicious input
		let sanitizedParams;
		try {
			sanitizedParams = validateRequestData(requestData);
		} catch (error: any) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// 5. Filter harmful content in request
		const { filtered, content } = filterHarmfulContent(
			sanitizedParams.message
		);
		if (filtered) {
			return NextResponse.json(
				{
					message: { role: "assistant", content },
					done: true,
					model_used: sanitizedParams.model,
					filtered_content: true,
				},
				{
					headers: getRateLimitHeaders(rateLimit.remaining),
				}
			);
		}

		// 6. Prepare validated request for LLM API
		const messages = [{ role: "user", content: sanitizedParams.message }];
		const requestParams = {
			model: sanitizedParams.model,
			messages: messages,
			stream: false,
			temperature: sanitizedParams.temperature,
			top_p: sanitizedParams.top_p,
			max_tokens: sanitizedParams.max_tokens,
			frequency_penalty: sanitizedParams.frequency_penalty,
			presence_penalty: sanitizedParams.presence_penalty,
			stop: sanitizedParams.stop_sequences,
			seed: sanitizedParams.seed,
		};

		// 7. Call external API with timeout protection
		let data;
		try {
			data = await timeoutProtectedFetch(requestParams);
		} catch (error: any) {
			if (error.message === "Request timed out") {
				return NextResponse.json(
					{
						error: "Request timed out. Your query may be too complex or the system is currently overloaded.",
					},
					{ status: 408 }
				);
			}
			return NextResponse.json(
				{ error: "Failed to process your request" },
				{ status: 500 }
			);
		}

		// 8. Filter harmful content in response
		const responseCheck = filterHarmfulContent(data.message.content);
		if (responseCheck.filtered) {
			data.message.content = responseCheck.content;
		}

		// 9. Return safe response with rate limit headers
		return NextResponse.json(
			{
				message: data.message,
				done: true,
				model_used: sanitizedParams.model,
				filtered_content: responseCheck.filtered,
			},
			{
				headers: getRateLimitHeaders(rateLimit.remaining),
			}
		);
	} catch (error) {
		console.error("Error in secure API route:", error);
		// Return generic error without exposing system details
		return NextResponse.json(
			{ error: "An error occurred while processing your request" },
			{ status: 500 }
		);
	}
}
