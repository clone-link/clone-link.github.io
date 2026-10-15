# CloneLink

> **Smart Git Clone Command Generator & Subfolder Downloader**  
> An ultra-minimal, 100% client-side developer utility built with [Astro](https://astro.build) and [React](https://react.dev).

[![Website](https://img.shields.io/badge/website-clone--link.github.io-4F46E5?style=flat-square)](https://clone-link.github.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)](LICENSE)
[![Support Developer](https://img.shields.io/badge/Buy_Me_a_Coffee-kisharadilz-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/kisharadilz)

---

## ⚡ Overview

CloneLink eliminates friction in daily Git workflows. Paste any GitHub repository URL, deep folder link, or `org/repo` shorthand to:
- Instantly generate chained terminal commands (`clone + cd + VS Code/npm`).
- Download specific repository subfolders as a `.zip` archive directly in the browser memory without cloning entire monorepos.
- Switch seamlessly between **HTTPS**, **SSH**, and **GitHub CLI (`gh`)** protocols.
- **100% client-side execution**: Zero backend servers, zero logging, and complete privacy.

---

## 🚀 Key Features

- **Smart URL & Shorthand Parsing**: Accepts standard HTTPS URLs, SSH endpoints, `owner/repo` shorthands, and deep directory trees (`/tree/main/src/components`).
- **Single-Org Expansion**: Entering a single username or organization (e.g. `torvalds`) auto-expands to its GitHub Pages root repository (`torvalds.github.io`).
- **Instant Terminal Chains**:
  - `git clone <url> && cd <repo>` (Clone & Enter)
  - `git clone <url> && cd <repo> && code .` (Clone & Open in VS Code)
  - `git clone <url> && cd <repo> && npm i && npm run dev` (Clone, Install & Dev with `npm`/`pnpm`/`yarn`/`bun` toggle)
  - `git clone ... && cd <repo>.github.io` (GitHub Pages Quick-Clone)
  - Native `git sparse-checkout` commands when targeting subfolders.
- **Client-Side Subfolder Downloader**: Recursively fetches directory contents via GitHub REST API and raw endpoints, assembling and downloading a `.zip` archive in-memory via `JSZip`.
- **7 Languages Supported**: Subpath i18n routing for English (`/`), Spanish (`/es`), Portuguese (`/pt`), German (`/de`), French (`/fr`), Japanese (`/ja`), and Simplified Chinese (`/zh`).
- **Developer Aesthetic**: Crisp Light and Dark themes, JetBrains Mono font tokens, responsive icon-only collapsing navbar on mobile/tablet, and full SEO structured data (`WebApplication` & `FAQPage` JSON-LD).

---

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build) (Static Site Generation, Subpath i18n routing)
- **UI Island**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Client-Side Compression**: [JSZip](https://stuk.github.io/jszip/)
- **Icons & Effects**: [Lucide React](https://lucide.dev), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Deployment**: GitHub Pages (Static root domain `https://clone-link.github.io`)

---

## 💻 Local Development

```bash
# Clone repository
git clone https://github.com/clone-link/clone-link.github.io.git
cd clone-link.github.io

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview static build
npm run preview
```

---

## ☕ Support the Developer

If you find CloneLink useful, please consider supporting the project:  
👉 **[Buy Me a Coffee](https://buymeacoffee.com/kisharadilz)**

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
