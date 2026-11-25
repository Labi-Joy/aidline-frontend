'use client';

import { useEffect, useRef, useState } from 'react';

import { TxStatus } from '@/components/ui/TxStatus';
import { useWallet } from '@/components/wallet/WalletProvider';
import { api, reuseUpload, type CampaignDetail, type CachedUpload } from '@/lib/api';
import { config } from '@/lib/config';
import { formatAmount } from '@/lib/format';
import {
  formatFileSize,
  isProofSelectionValid,
  proofFileKey,
  proofUploadErrors,
  proofUploadHint,
  PROOF_UPLOAD_ACCEPT,
} from '@/lib/proofUpload';
import { describeError } from '@/lib/stellar/errors';
import { aidline } from '@/lib/stellar/tx';
import { useTx } from '@/lib/useTx';

interface ProofPreview {
  file: File;
  key: string;
  url: string;
}

/** Lets the campaign's verifier publish evidence and release the next milestone. */
export function VerifierPanel({ campaign }: { campaign: CampaignDetail }) {
  const { address, sign, isWrongNetwork } = useWallet();
  const { state, run, busy } = useTx();
  const [note, setNote] = useState('');
  const [previews, setPreviews] = useState<ProofPreview[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewsRef = useRef(previews);
  const uploadedProof = useRef<CachedUpload<string, ProofPreview[]> | null>(null);

  useEffect(
    () => () => {
      for (const preview of previewsRef.current) URL.revokeObjectURL(preview.url);
    },
    [],
  );

  if (address !== campaign.verifier || campaign.status !== 'active') return null;

  const next = campaign.milestones[campaign.milestonesReleased];
  if (!next) return null;
  const escrow = BigInt(campaign.raised) - BigInt(campaign.released);
  const funded = escrow >= BigInt(next.amount);
  const files = previews.map((preview) => preview.file);
  const validationErrors = proofUploadErrors(files);
  const proofKey = `${campaign.id}:${next.index}:${note}`;

  const updatePreviews = (selected: ProofPreview[]) => {
    previewsRef.current = selected;
    setPreviews(selected);
  };

  const addFiles = (selected: FileList | null) => {
    const added = Array.from(selected ?? [])
      .filter((file) => !previewsRef.current.some((preview) => preview.key === proofFileKey(file)))
      .map((file) => ({
        file,
        key: proofFileKey(file),
        url: URL.createObjectURL(file),
      }));
    updatePreviews([...previewsRef.current, ...added]);
    uploadedProof.current = null;
    setUploadError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const removeFile = (key: string) => {
    const removed = previewsRef.current.find((preview) => preview.key === key);
    if (removed) URL.revokeObjectURL(removed.url);
    updatePreviews(previewsRef.current.filter((preview) => preview.key !== key));
    uploadedProof.current = null;
    setUploadError(null);
  };

  const clearProofs = () => {
    for (const preview of previewsRef.current) URL.revokeObjectURL(preview.url);
    updatePreviews([]);
    uploadedProof.current = null;
  };

  const submit = async () => {
    setUploadError(null);
    if (!isProofSelectionValid(files) || note.trim().length < 10) return;
    const selected = previewsRef.current;
    let proofUri = reuseUpload(uploadedProof.current, proofKey, selected);
    if (!proofUri) {
      const form = new FormData();
      form.set('campaignId', campaign.id);
      form.set('milestoneIndex', String(next.index));
      form.set('note', note);
      for (const preview of selected) form.append('files', preview.file);

      try {
        proofUri = (await api.uploadProof(form)).uri;
        uploadedProof.current = { key: proofKey, input: selected, uri: proofUri };
      } catch (err) {
        setUploadError(describeError(err));
        return;
      }
    }
    const before = campaign.milestonesReleased;
    const ok = await run(
      (on) => aidline.approveMilestone(address, campaign.id, proofUri, sign, on),
      async () => (await api.campaign(campaign.id)).milestonesReleased > before,
    );
    if (ok) {
      setNote('');
      clearProofs();
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <section className="border border-ink p-5">
      <p className="kicker text-ink">You verify this campaign</p>
      <h3 className="mt-2 text-xl">Release milestone {next.index + 1}</h3>
      <p className="mt-2 text-[0.9375rem]">
        Approving pays <span className="figure text-ink">{formatAmount(next.amount)}</span> to the
        beneficiary. Your evidence is published with the payout.
      </p>
      {!funded ? (
        <p className="mt-4 text-[0.9375rem] text-ink-muted">
          Escrow holds {formatAmount(escrow)}, which is not enough for this milestone yet.
        </p>
      ) : (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label className="label" htmlFor="proof-note">
              What did you verify?
            </label>
            <textarea
              id="proof-note"
              className="field min-h-24"
              placeholder="Delivered 40 water tanks to three shelters. Receipts attached."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                uploadedProof.current = null;
              }}
              minLength={10}
              maxLength={2000}
              required
              disabled={busy}
            />
          </div>
          <div>
            <label className="label" htmlFor="proof-files">
              Photos or documents
            </label>
            <input
              id="proof-files"
              ref={fileInput}
              type="file"
              multiple
              accept={PROOF_UPLOAD_ACCEPT}
              onChange={(e) => addFiles(e.target.files)}
              className="block w-full text-sm file:mr-3 file:border file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:text-ink"
              disabled={busy}
            />
            <p className="hint">{proofUploadHint()}</p>
            {validationErrors.length > 0 && (
              <ul role="alert" className="mt-2 space-y-1 text-[0.8125rem] text-danger">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            {previews.length > 0 && (
              <ul className="mt-3 space-y-2">
                {previews.map((preview) => (
                  <li key={preview.key} className="flex items-center gap-3 border border-rule p-2">
                    {preview.file.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview.url}
                        alt={`Selected proof ${preview.file.name}`}
                        className="h-16 w-20 border border-rule object-cover"
                      />
                    ) : (
                      <span className="figure flex h-16 w-20 items-center justify-center border border-rule text-xs text-ink-muted">
                        PDF
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem]">{preview.file.name}</p>
                      <p className="figure text-xs text-ink-muted">
                        {formatFileSize(preview.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="link text-[0.8125rem]"
                      onClick={() => removeFile(preview.key)}
                      aria-label={`Remove ${preview.file.name}`}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={
              busy ||
              note.trim().length < 10 ||
              !isProofSelectionValid(files) ||
              isWrongNetwork
            }
          >
            Publish evidence and release {formatAmount(next.amount)}
          </button>
          {isWrongNetwork && (
            <p className="text-xs text-danger" role="status">
              Switch your wallet to {config.network} to continue.
            </p>
          )}
          {uploadError && (
            <p role="alert" className="text-[0.9375rem] text-danger">
              {uploadError}
            </p>
          )}
        </form>
      )}
      <TxStatus
        state={state}
        success="Milestone released. The evidence is now public on this page."
      />
    </section>
  );
}
