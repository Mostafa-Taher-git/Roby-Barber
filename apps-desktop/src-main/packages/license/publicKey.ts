// Owner's RSA-2048 public key — embedded in the app for offline license verification.
// The matching PRIVATE key exists only on the owner's machine (tools/license-gen, keys stored outside the repo).
// Regenerating the keypair invalidates every previously issued key — never replace this unless compromised.
export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkCIeC/xZvxRra+JvLQ6H
/CXlZO90h8K2EzRigxYIsIl4T38H8Q+fSixQ3VI8Uj2ARuKvm/p3kBHNovsa9KlI
Ndtr+aoBB3AM/S9U3mM1DtbjPzO7vAmiY7pNFI15tgd9N9Mpc94dYKK5gX4YFvOM
3ENAlyjVcAu5+ORVX9o9B3/yKqiEXMVh0cXaWgP9XKQr8gKa75SjTmWwYENxLRMD
xKizOaMl2dEVhlTSuEluQle5/YhrzcEwnSa2oQEgssJGJa5RPT65hfHwfuBBrAuI
EtThoR2NQ1D3sCZtNlg4AJHgY3VCIYlJrlMwnVQGMgqkDAnPbIxAfwmG56j5SODD
UwIDAQAB
-----END PUBLIC KEY-----
`;
