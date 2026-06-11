const registered = new Set<string>([
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
]);

export function mockIsRegistered(address: string): boolean {
  return registered.has(address.toLowerCase());
}

export function mockRegister(addresses: string[]): void {
  for (const addr of addresses) registered.add(addr.toLowerCase());
}
