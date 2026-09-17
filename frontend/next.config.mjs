import path from "path";
import { fileURLToPath } from "url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: frontendRoot,
  async redirects() {
    return [{ source: "/benevole/certificats", destination: "/volunteer/certificates", permanent: false }];
  },
};

export default nextConfig;
