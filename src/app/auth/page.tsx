"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === "authenticated") {
			router.push("/");
		}
	}, [status, router]);

	if (status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
				<p>Loading...</p>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
				<div className="bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
					<h1 className="text-2xl font-semibold mb-4">
						You&apos;re not signed in
					</h1>
					<button
						onClick={() =>
							signIn("google", {
								callbackUrl: window.location.href,
							})
						}
						className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
					>
						Sign In with Google
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
			<div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
				<h1 className="text-3xl font-bold mb-4">
					Welcome, {session.user?.name}
				</h1>
				<p className="mb-6 text-gray-300">
					Email: {session.user?.email}
				</p>
				<button
					onClick={() =>
						signOut({ callbackUrl: window.location.href })
					}
					className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition"
				>
					Sign Out
				</button>
			</div>
		</div>
	);
}
