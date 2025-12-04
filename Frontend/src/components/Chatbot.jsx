import React, { useState, useRef, useEffect } from "react";


const Chatbot = () => {
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState([
		{ from: "bot", text: "Hi! I’m CampVerse Assistant. How can I help you today?" }
	]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const chatEndRef = useRef(null);

	useEffect(() => {
		if (open && chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, open]);

	const CHATBOT_URL = import.meta.env.VITE_CHATBOT_URL || "https://imkrish-chatbot.hf.space/chatbot";
	const sendMessage = async (e) => {
		e.preventDefault();
		if (!input.trim()) return;
		const userMsg = { from: "user", text: input };
		setMessages((msgs) => [...msgs, userMsg]);
		setInput("");
		setLoading(true);
		try {
			// Call backend API
			const res = await fetch(CHATBOT_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question: input })
			});
			const data = await res.json();
			setMessages((msgs) => [
				...msgs,
				{ from: "bot", text: data.answer || data.error || "Sorry, I couldn't understand that." }
			]);
		} catch (err) {
			console.error('Chatbot error:', err);
			setMessages((msgs) => [
			...msgs,
			{ from: "bot", text: "Network error. Please try again." }
		]);
	}
	setLoading(false);
	};

		return (
			<>
				{/* Floating Chat Button */}
				<button
					className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-3xl hover:scale-110 transition-transform duration-200 focus:outline-none"
					onClick={() => setOpen((o) => !o)}
					aria-label="Open chatbot"
				>
					💬
				</button>
				{/* Chat Window */}
				{open && (
					<div className="fixed bottom-24 right-6 z-50 w-80 max-w-full bg-white border border-gray-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
						<div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold">
							<span>CampVerse Assistant</span>
							<button
								className="text-2xl hover:text-gray-200 focus:outline-none"
								onClick={() => setOpen(false)}
								aria-label="Close chatbot"
							>
								×
							</button>
						</div>
						<div className="flex-1 px-3 py-2 overflow-y-auto space-y-2 bg-gray-50" style={{ maxHeight: '350px' }}>
							{messages.map((msg, i) => (
								<div
									key={i}
									className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									<div
										className={`px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-md ${
											msg.from === 'user'
												? 'bg-blue-600 text-white rounded-br-none'
												: 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
										}`}
									>
										{msg.text.split('\n').map((line, idx) => (
											<React.Fragment key={idx}>
												{line}
												{idx < msg.text.split('\n').length - 1 && <br />}
											</React.Fragment>
										))}
									</div>
								</div>
							))}
							<div ref={chatEndRef} />
						</div>
						<form className="flex items-center border-t border-gray-200 bg-white px-3 py-2" onSubmit={sendMessage}>
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Type your message..."
								disabled={loading}
								className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-gray-100"
								autoFocus
							/>
							<button
								type="submit"
								className="ml-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={loading || !input.trim()}
							>
								{loading ? "..." : "Send"}
							</button>
						</form>
					</div>
				)}
			</>
		);
};

export default Chatbot;
