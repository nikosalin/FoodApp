"use client";

import {
  CheckCircle2,
  Clock3,
  Copy,
  Mail,
  MapPin,
  Phone,
  Store,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  approveRequest,
  rejectRequest,
  subscribeToAdminState,
} from "../lib/admin-store";
import type {
  GeneratedCredentials,
  RegistrationRequest,
  SubscriptionPlan,
} from "../types";
import {
  AdminBadge,
  AdminCard,
  AdminModal,
  fieldClassName,
  formatAdminDate,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./AdminUi";

export function RequestsManager() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [approveTarget, setApproveTarget] =
    useState<RegistrationRequest | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<RegistrationRequest | null>(null);
  const [credentials, setCredentials] =
    useState<GeneratedCredentials | null>(null);

  useEffect(
    () => subscribeToAdminState((state) => setRequests(state.requests)),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
            Onboarding
          </p>
          <h1 className="mt-1 text-3xl font-black">Pending requests</h1>
          <p className="mt-2 text-stone-500">
            Review and approve restaurant registrations.
          </p>
        </div>
        <AdminBadge tone="warning">{requests.length} pending</AdminBadge>
      </div>

      {requests.length === 0 ? (
        <AdminCard className="py-14 text-center">
          <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
          <h2 className="mt-4 text-xl font-bold">All caught up</h2>
          <p className="mt-1 text-stone-500">
            There are no pending registrations.
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <AdminCard key={request.id}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {request.restaurantName}
                    </h2>
                    <AdminBadge>{request.restaurantType}</AdminBadge>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                    <Clock3 className="size-4" />
                    {formatAdminDate(request.createdAt)}
                  </p>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <Store className="size-4 text-stone-400" />
                      {request.ownerName}
                    </p>
                    <a
                      href={`tel:${request.phone}`}
                      className="flex items-center gap-2 hover:text-amber-700"
                    >
                      <Phone className="size-4 text-stone-400" />
                      {request.phone}
                    </a>
                    <a
                      href={`mailto:${request.email}`}
                      className="flex items-center gap-2 hover:text-amber-700"
                    >
                      <Mail className="size-4 text-stone-400" />
                      {request.email}
                    </a>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 text-stone-400" />
                      {request.city}, {request.address}
                    </p>
                  </div>
                  {(request.heardFrom || request.notes) && (
                    <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
                      {request.heardFrom && (
                        <p>
                          <strong className="text-stone-900">Source:</strong>{" "}
                          {request.heardFrom}
                        </p>
                      )}
                      {request.notes && (
                        <p className="mt-1">
                          <strong className="text-stone-900">Notes:</strong>{" "}
                          {request.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 lg:w-36 lg:flex-col">
                  <button
                    type="button"
                    className={`${primaryButtonClassName} flex-1`}
                    onClick={() => setApproveTarget(request)}
                  >
                    <CheckCircle2 className="size-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} flex-1 text-red-700`}
                    onClick={() => setRejectTarget(request)}
                  >
                    <X className="size-4" />
                    Reject
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {approveTarget && (
        <ApproveRequestModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={(result) => {
            setApproveTarget(null);
            setCredentials(result);
          }}
        />
      )}
      {rejectTarget && (
        <RejectRequestModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
        />
      )}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}

function ApproveRequestModal({
  request,
  onClose,
  onApproved,
}: {
  request: RegistrationRequest;
  onClose: () => void;
  onApproved: (credentials: GeneratedCredentials) => void;
}) {
  const [email, setEmail] = useState(request.email);
  const [plan, setPlan] = useState<SubscriptionPlan>("free_trial");
  const [notes, setNotes] = useState("");

  return (
    <AdminModal title="Create restaurant account" onClose={onClose}>
      <div className="mb-5 rounded-xl bg-stone-50 p-4 text-sm">
        <p className="font-bold">{request.restaurantName}</p>
        <p className="mt-1 text-stone-500">
          {request.ownerName} · {request.city}
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onApproved(
            approveRequest(request, {
              email,
              subscriptionPlan: plan,
              internalNotes: notes,
            }),
          );
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            Login email
          </span>
          <input
            className={fieldClassName}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            Subscription plan
          </span>
          <select
            className={fieldClassName}
            value={plan}
            onChange={(event) =>
              setPlan(event.target.value as SubscriptionPlan)
            }
          >
            <option value="free_trial">Free Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">
            Internal notes
          </span>
          <textarea
            className={`${fieldClassName} h-24 py-3`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes for the admin team"
          />
        </label>
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-stone-600">
          A temporary password will be generated after approval.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={`${secondaryButtonClassName} flex-1`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${primaryButtonClassName} flex-1`}
          >
            Create account
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function RejectRequestModal({
  request,
  onClose,
}: {
  request: RegistrationRequest;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <AdminModal title="Reject registration" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          rejectRequest(request.id);
          onClose();
        }}
      >
        <p className="text-stone-600">
          Reject the request from{" "}
          <strong className="text-stone-950">{request.restaurantName}</strong>?
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Reason</span>
          <textarea
            className={`${fieldClassName} h-24 py-3`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this request was rejected"
            required
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            className={`${secondaryButtonClassName} flex-1`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
          >
            Reject
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function CredentialsModal({
  credentials,
  onClose,
}: {
  credentials: GeneratedCredentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const credentialText = `Email: ${credentials.email}\nTemporary password: ${credentials.password}\nLogin URL: ${credentials.loginUrl}`;

  return (
    <AdminModal title="Account created" onClose={onClose}>
      <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
      <p className="mt-3 text-center text-stone-600">
        Share these one-time credentials with the restaurant owner.
      </p>
      <div className="mt-5 space-y-3 rounded-xl bg-stone-950 p-4 font-mono text-sm text-stone-100">
        <p>
          <span className="text-stone-400">Email:</span> {credentials.email}
        </p>
        <p>
          <span className="text-stone-400">Password:</span>{" "}
          {credentials.password}
        </p>
        <p className="break-all">
          <span className="text-stone-400">URL:</span> {credentials.loginUrl}
        </p>
      </div>
      <button
        type="button"
        className={`${secondaryButtonClassName} mt-5 w-full`}
        onClick={async () => {
          await navigator.clipboard.writeText(credentialText);
          setCopied(true);
        }}
      >
        <Copy className="size-4" />
        {copied ? "Copied" : "Copy credentials"}
      </button>
      <button
        type="button"
        className={`${primaryButtonClassName} mt-3 w-full`}
        onClick={onClose}
      >
        Done
      </button>
    </AdminModal>
  );
}
