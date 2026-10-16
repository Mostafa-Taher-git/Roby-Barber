# Roby Barber — License Generator (OWNER ONLY)

Offline tools that issue lifetime activation keys. **These tools stay with you (the owner) — they are not shipped in the app.**

## One-time setup (done once, offline)

```powershell
node tools/license-gen/keygen.cjs
```

This creates, OUTSIDE the repo (default `%USERPROFILE%\RobyBarber-License-Keys`):

| file | purpose |
|---|---|
| `private.pem` | 🔒 THE SECRET — signs keys. **Back it up (USB/paper). Never commit, never send it to anyone, not even the developer after handover.** |
| `public.pem` | paste into `apps-desktop/src-main/packages/license/publicKey.ts` |
| `issued_keys.csv` | automatic log of every key you ever issued |

If `private.pem` is lost, no new keys can ever be issued (existing activated machines keep working).

## Issuing a key (customer flow)

1. Customer installs the app → lock screen shows `MID-XXXX-XXXX` (and a WhatsApp send button).
2. He sends you the MID.
3. You run:

```powershell
node tools/license-gen/sign.cjs --mid MID-XXXX-XXXX
```

4. Send the printed `RB1-...` key back to him. He enters it once in the lock screen → activated **forever on that PC only**.
5. Same key on another PC = rejected. No internet involved. No master key exists inside the app.

## Notes

- Keys are RSA-2048 signatures bound to the MID. The app verifies with the embedded public key.
- Keep `issued_keys.csv` for your records (who got what, when).
- Disputed machine? Add its MID to `BLOCKED_MIDS` in `src-main/packages/license/index.ts` and ship an update — that is the only (offline) revoke possible.
- Rotating the keypair invalidates ALL previously issued keys — don't, unless compromised.
