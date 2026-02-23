"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api";
import { ApiError } from "@/lib/api";

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  interests_description: string;
}

interface FormErrors {
  email?: string;
  first_name?: string;
  last_name?: string;
  interests_description?: string;
  submit?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.first_name.trim()) errors.first_name = "First name is required.";
  if (!form.last_name.trim()) errors.last_name = "Last name is required.";
  if (!form.interests_description.trim()) {
    errors.interests_description = "Tell us what events you're looking for.";
  } else if (form.interests_description.trim().length < 10) {
    errors.interests_description = "Please describe your interests (at least 10 characters).";
  }
  return errors;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    interests_description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === "email") setDuplicateEmail(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const user = await createUser({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
        interests_description: form.interests_description.trim(),
      });
      localStorage.setItem("user_id", user.id);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDuplicateEmail(true);
      } else {
        setErrors({ submit: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  const interestsLength = form.interests_description.trim().length;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white">Get started</h1>
        <p className="mt-2 text-zinc-400">
          Sign up once. We'll handle the RSVPs automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Section 1 — Personal info */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            1 — Tell us about yourself
          </h2>
          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first_name"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  First name <span className="text-red-400">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    errors.first_name ? "border-red-500" : "border-zinc-700"
                  }`}
                  placeholder="Jane"
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.first_name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="last_name"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Last name <span className="text-red-400">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                    errors.last_name ? "border-red-500" : "border-zinc-700"
                  }`}
                  placeholder="Smith"
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className={`w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  errors.email || duplicateEmail
                    ? "border-red-500"
                    : "border-zinc-700"
                }`}
                placeholder="jane@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
              {duplicateEmail && (
                <p className="mt-1 text-xs text-yellow-400">
                  You're already signed up!{" "}
                  <a
                    href="/dashboard"
                    className="underline hover:text-yellow-300"
                  >
                    Go to your dashboard.
                  </a>
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Phone{" "}
                <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                disabled={loading}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Event interests */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            2 — What events are you looking for?
          </h2>
          <div>
            <label
              htmlFor="interests_description"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Describe your interests <span className="text-red-400">*</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              We'll use AI to match you with events that fit your interests and
              automatically RSVP you.
            </p>
            <textarea
              id="interests_description"
              name="interests_description"
              rows={5}
              value={form.interests_description}
              onChange={handleChange}
              disabled={loading}
              className={`w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none ${
                errors.interests_description
                  ? "border-red-500"
                  : "border-zinc-700"
              }`}
              placeholder={
                "e.g., Tech startup networking events, AI panels, happy hours with founders\n\ne.g., Music showcases, indie bands, late night parties, DJ sets"
              }
            />
            <div className="mt-1 flex items-center justify-between">
              <div>
                {errors.interests_description && (
                  <p className="text-xs text-red-400">
                    {errors.interests_description}
                  </p>
                )}
              </div>
              <p
                className={`text-xs ${
                  interestsLength < 10 && interestsLength > 0
                    ? "text-yellow-400"
                    : interestsLength >= 10
                      ? "text-zinc-500"
                      : "text-zinc-600"
                }`}
              >
                {interestsLength} / 10 min
              </p>
            </div>
          </div>
        </section>

        {/* Submit error */}
        {errors.submit && (
          <p className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {errors.submit}
          </p>
        )}

        {/* Submit — Section 3 */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            3 — You're ready
          </h2>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing you up..." : "Start Auto-RSVPing →"}
          </button>
        </section>
      </form>
    </div>
  );
}
