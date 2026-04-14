import React, { Suspense } from "react";
import { LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GetCredentialsForUser } from "@/actions/credentials/getCredentialsForUser";
import CreateCredentialDialog from "./_components/CreateCredentialDialog";
import DeleteCredentialDialog from "./_components/DeleteCredentialDialog";
import { formatDistanceToNow } from "date-fns";

export default function CredentialsPage() {
  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Credentials</h1>
          <p className="pg-subtitle">
            Manage your encrypted authentication credentials
          </p>
        </div>
        <CreateCredentialDialog />
      </div>

      {/* Encryption notice */}
      <div className="encrypt-alert">
        <div className="encrypt-alert-icon">
          <ShieldCheckIcon size={16} />
        </div>
        <div>
          <div className="encrypt-alert-title">End-to-end Encrypted</div>
          <div className="encrypt-alert-desc">
            All credentials are encrypted at rest using AES-256. Your secrets
            are never stored in plain text.
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="cred-list">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        }
      >
        <UserCredentials />
      </Suspense>
    </div>
  );
}

async function UserCredentials() {
  const credentials = await GetCredentialsForUser();

  if (!credentials) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.18)",
          borderRadius: "var(--r-md)",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.875rem",
          color: "#ef4444",
        }}
      >
        Something went wrong. Please try again later.
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <ShieldCheckIcon size={28} strokeWidth={1.5} />
        </div>
        <div className="empty-state-title">No credentials yet</div>
        <div className="empty-state-sub">
          Store your first encrypted credential to enable authenticated
          scraping.
        </div>
        <CreateCredentialDialog triggerText="Add your first credential" />
      </div>
    );
  }

  return (
    <div className="cred-list">
      {credentials.map((credential) => {
        const createdAt = formatDistanceToNow(credential.createdAt, {
          addSuffix: true,
        });
        return (
          <div key={credential.id} className="cred-card">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}
            >
              <div className="cred-icon">
                <LockKeyholeIcon size={17} />
              </div>
              <div>
                <div className="cred-name">{credential.name}</div>
                <div className="cred-date">Added {createdAt}</div>
              </div>
            </div>
            <DeleteCredentialDialog name={credential.name} />
          </div>
        );
      })}
    </div>
  );
}
