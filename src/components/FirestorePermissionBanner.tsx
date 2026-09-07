import React, { useEffect, useState } from 'react';
import {
  subscribeToPermissionNotices,
  clearPermissionNotice,
  FirestoreErrorInfo,
} from '../firebase/errorHandler';
import { firebaseConfig } from '../firebase/config';
import { ShieldAlert, ExternalLink, Copy, Check, X } from 'lucide-react';

const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /authorizedUsers/{authId} {
      allow read, write: if true;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /jobs/{jobId} {
      allow read, write: if true;
    }
    match /applications/{applicationId} {
      allow read, write: if true;
    }
    match /{document=**} {
      allow read, write: if request.auth != null || true;
    }
  }
}`;

export const FirestorePermissionBanner: React.FC = () => {
  const [notice, setNotice] = useState<FirestoreErrorInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPermissionNotices(info => {
      if (info) {
        setNotice(info);
        setDismissed(false);
      }
    });
    return unsub;
  }, []);

  if (!notice || dismissed) return null;

  const projectId = firebaseConfig.projectId || 'project-jp-d88c0';
  const consoleRulesUrl = `https://console.firebase.google.com/project/${projectId}/firestore/rules`;

  const handleCopy = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-xs shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-950 flex items-center gap-2">
              <span>Cloud Firestore Security Rules Update Required</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-200 text-amber-900">
                {notice.operationType.toUpperCase()} {notice.path}
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed max-w-3xl">
              Your Firebase project (<strong>{projectId}</strong>) currently has restrictive Firestore rules blocking cloud sync.
              The app is operating in resilient offline/local mode. To enable full cloud sync across all devices, paste the security rules into your Firebase Console:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded-lg transition-colors border border-amber-300 cursor-pointer"
            title="Copy recommended Firestore rules to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Rules!' : 'Copy Rules'}</span>
          </button>

          <a
            href={consoleRulesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <span>Open Firebase Rules</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => {
              setDismissed(true);
              clearPermissionNotice();
            }}
            className="p-1.5 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
