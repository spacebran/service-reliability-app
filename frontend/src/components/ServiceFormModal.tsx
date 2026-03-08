import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { createService, updateService } from "../api";
import type { Service, ServiceCreate } from "../types";

interface Props {
  service: Service | null;
  onClose: () => void;
  onSaved: (saved: Service) => void;
}

const ENVIRONMENTS = ["production", "staging", "development"];

interface FormState {
  name: string;
  url: string;
  environment: string;
  expected_version: string;
  check_interval_seconds: number;
  is_active: boolean;
}

function inputClass(hasError = false) {
  return [
    "w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
    hasError ? "border-red-500" : "border-slate-700",
  ].join(" ");
}

export default function ServiceFormModal({ service, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const isEdit = service !== null;

  const [form, setForm] = useState<FormState>({
    name: service?.name ?? "",
    url: service?.url ?? "",
    environment: service?.environment ?? "production",
    expected_version: service?.expected_version ?? "",
    check_interval_seconds: service?.check_interval_seconds ?? 60,
    is_active: service?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.url.trim()) next.url = "URL is required";
    else if (!/^https?:\/\/.+/.test(form.url.trim())) next.url = "Must be a valid http/https URL";
    if (form.check_interval_seconds < 5) next.check_interval_seconds = "Minimum 5 seconds";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const mutation = useMutation({
    mutationFn: (data: ServiceCreate) =>
      isEdit ? updateService(service.id, data) : createService(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onSaved(saved);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      url: form.url.trim(),
      environment: form.environment,
      expected_version: form.expected_version.trim() || null,
      check_interval_seconds: form.check_interval_seconds,
      is_active: form.is_active,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? "Edit service" : "Add service"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Production API"
              className={inputClass(!!errors.name)}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://api.example.com/health"
              className={inputClass(!!errors.url)}
            />
            {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url}</p>}
          </div>

          {/* Environment */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Environment
            </label>
            <select
              value={form.environment}
              onChange={(e) => set("environment", e.target.value)}
              className={inputClass()}
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          {/* Expected version */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Expected version
              <span className="ml-1.5 text-slate-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.expected_version}
              onChange={(e) => set("expected_version", e.target.value)}
              placeholder="e.g. 1.4.2"
              className={inputClass()}
            />
          </div>

          {/* Check interval */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Check interval (seconds)
            </label>
            <input
              type="number"
              min={5}
              value={form.check_interval_seconds}
              onChange={(e) => set("check_interval_seconds", parseInt(e.target.value, 10) || 60)}
              className={inputClass(!!errors.check_interval_seconds)}
            />
            {errors.check_interval_seconds && (
              <p className="text-xs text-red-400 mt-1">{errors.check_interval_seconds}</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-medium text-slate-400">Active monitoring</span>
            <button
              type="button"
              onClick={() => set("is_active", !form.is_active)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                ${form.is_active ? "bg-blue-600" : "bg-slate-700"}`}
            >
              <span
                className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5
                  ${form.is_active ? "translate-x-4.5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {/* Server error */}
          {mutation.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Failed to save. Please try again.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
