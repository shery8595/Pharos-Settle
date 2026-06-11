#!/usr/bin/env python3
"""Minimal Pharos SPV proof shape validator (vendored stub for Tier A stretch).
For production verification use PharosNetwork/examples spv-verification/spv_verify.py
"""
import json
import sys

def main():
    if len(sys.argv) < 2:
        print("usage: spv_verify.py proof.json [--address ADDR] [--no-rpc]", file=sys.stderr)
        sys.exit(1)
    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = data.get("result", data)
    proofs = result.get("accountProof")
    if not isinstance(proofs, list) or len(proofs) == 0:
        print("invalid: missing accountProof", file=sys.stderr)
        sys.exit(2)
    for node in proofs:
        if "proofNode" not in node:
            print("invalid: proofNode missing", file=sys.stderr)
            sys.exit(3)
    print("OK: Pharos accountProof structure valid")

if __name__ == "__main__":
    main()
