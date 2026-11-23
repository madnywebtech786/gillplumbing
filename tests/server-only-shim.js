// no-op: Next.js's bundler strips real "server-only" imports from the
// client bundle at build time. Outside that bundler (Vitest), the real
// package unconditionally throws, so tests alias it to this empty module.
