import React, { useState } from "react";
import { useEditor } from "../../context/EditorContext";

export default function FeedbackModal() {
  const { state, dispatch, showToast } = useEditor();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!state.ui.feedbackModalOpen) return null;

  const send = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });

      if (res.ok) {
        showToast("Feedback saved!", "success");
        setEmail("");
        setMessage("");
        dispatch({ type: "CLOSE_FEEDBACK_MODAL" });
      } else {
        showToast("Server error", "error");
      }
    } catch (err) {
      showToast("Server not running", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <form onSubmit={send} className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-bold mb-4">Feedback</h3>
        <input 
          type="email" placeholder="Email (optional)" 
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 mb-3 text-sm text-white outline-none focus:border-blue-500"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <textarea 
          required placeholder="What's on your mind?" 
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 mb-4 text-sm text-white outline-none focus:border-blue-500 h-32 resize-none"
          value={message} onChange={e => setMessage(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => dispatch({ type: "CLOSE_FEEDBACK_MODAL" })} className="flex-1 py-2 text-sm bg-gray-800 text-gray-400 rounded hover:bg-gray-700">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50">
            {loading ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}