"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, updateUser, triggerMatch } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { User } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    interests_description: "",
  });

  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getUser(userId)
      .then((u) => {
        setUser(u);
        setForm({
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone || "",
          interests_description: u.interests_description,
        });
      })
      .catch(() => {
        setSaveMsg({ type: "error", text: "Failed to load your profile." });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaveMsg(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const errors: string[] = [];
    if (!form.first_name.trim()) errors.push("First name is required.");
    if (!form.last_name.trim()) errors.push("Last name is required.");
    if (!form.interests_description.trim() || form.interests_description.trim().length < 10) {
      errors.push("Interests description must be at least 10 characters.");
    }
    if (errors.length > 0) {
      setSaveMsg({ type: "error", text: errors[0] });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUser(userId, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
        interests_description: form.interests_description.trim(),
      });
      setUser(updated);
      setSaveMsg({ type: "success", text: "Profile saved!" });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to save changes. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRematch() {
    if (!userId) return;
    setRematching(true);
    setSaveMsg(null);
    try {
      await updateUser(userId, {
        interests_description: form.interests_description.trim(),
      });
      await triggerMatch(userId);
      setSaveMsg({ type: "success", text: "Re-matching complete! Check your dashboard for updated scores." });
    } catch {
      setSaveMsg({ type: "error", text: "Re-matching failed. Please try again." });
    } finally {
      setRematching(false);
    }
  }

  function handleDeleteAccount() {
    // Clear local state and redirect — backend delete endpoint not yet wired
    localStorage.removeItem("user_id");
    router.push("/");
  }

  const interestsLength = form.interests_description.trim().length;

  if (!userId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-4 text-zinc-400">Sign up first to access settings.</p>
        <a
          href="/signup"
          className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Sign Up
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-zinc-800" />
          <div className="h-10 rounded bg-zinc-800" />
          <div className="h-10 rounded bg-zinc-800" />
          <div className="h-32 rounded bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-white">Settings</h1>

      <form onSubmit={handleSave} noValidate className="space-y-8">
        {/* Profile section */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Profile
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  First name <span className="text-red-400">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Last name <span className="text-red-400">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <div className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                {user?.email}
              </div>
              <p className="mt-1 text-xs text-zinc-600">Email cannot be changed.</p>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Phone <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                disabled={saving}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </section>

        {/* Interests section */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Event Interests
          </h2>
          <div>
            <label htmlFor="interests_description" className="mb-1.5 block text-sm font-medium text-zinc-300">
              What events are you looking for? <span className="text-red-400">*</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Update this and click &quot;Re-match Events&quot; to find new matches based on your current interests.
            </p>
            <textarea
              id="interests_description"
              name="interests_description"
              rows={5}
              value={form.interests_description}
              onChange={handleChange}
              disabled={saving || rematching}
              className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., Tech startup networking events, AI panels, happy hours with founders"
            />
            <p className={`mt-1 text-right text-xs ${interestsLength < 10 && interestsLength > 0 ? "text-yellow-400" : "text-zinc-600"}`}>
              {interestsLength} / 10 min
            </p>
          </div>
          <button
            type="button"
            onClick={handleRematch}
            disabled={rematching || saving || interestsLength < 10}
            className="mt-3 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rematching ? "Re-matching..." : "Re-match Events"}
          </button>
        </section>

        {/* Feedback */}
        {saveMsg && (
          <div className={`rounded-md border px-3 py-2 text-sm ${
            saveMsg.type === "success"
              ? "border-green-800 bg-green-950/50 text-green-400"
              : "border-red-800 bg-red-950/50 text-red-400"
          }`}>
            {saveMsg.text}
          </div>
        )}

        {/* Save */}
        <button
          type="submit"
          disabled={saving || rematching}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Danger zone */}
      <section className="mt-12 rounded-lg border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-red-500">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          Deleting your account will sign you out and remove your local session. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-red-800 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-600 hover:text-red-300"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Are you sure?</span>
            <button
              onClick={handleDeleteAccount}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-md px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
