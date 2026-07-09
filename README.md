# TalentMatch 🎯

**TalentMatch** is an open-source AI-powered resume screening platform. It automates the analysis of PDF resumes, ranks candidates against job requirements, and delivers structured insights — while staying compliant with data privacy regulations.

> 🎓 Originally developed as an MVP for a university extension project at [UTFPR](https://www.utfpr.edu.br/) (MEIU discipline), in partnership with a retail company. The solution was validated in a real recruitment environment and is now open for anyone to use, adapt, and contribute to.

---

## ✨ Features

- **AI-Powered Ranking** — Candidates are scored 0–100 across 9 structured evaluation pillars powered by Google Gemini 2.5 Flash.
- **Multimodal Processing** — Handles both text-based and scanned/image PDFs (via Gemini Vision OCR fallback).
- **Privacy-First Pipeline** — Automatic PII anonymization (CPF, email, phone, URLs) via regex before any data leaves your server.
- **Anti-Bias Protocol** — AI is explicitly instructed to ignore gender, age, race, religion, and marital status.
- **Human Review (LGPD Art. 20)** — Recruiters can override AI scores and add written justifications, preventing purely automated decisions.
- **Bulk Upload** — Drag & drop multiple resumes at once; each is processed asynchronously in the background.
- **Secure PDF Viewer** — Files are served through controlled backend routes, not exposed as static public assets.
- **Real-time Dashboard** — Job management panel with live candidate counters, dynamic search, and pagination.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (Vite + React)                  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP/JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│            Backend (Python + FastAPI)                  │
│  - Background Tasks (Async Processing)                 │
│  - AI Lock (Rate Limit Management)                     │
└──────────────┬────────────┬─────────────┬──────────────┘
               │            │             │
               ▼            ▼             ▼
┌──────────────┐     ┌──────┴──────┐     ┌───────────────┐
│  SQLite DB   │     │   /uploads  │     │ Google Gemini │
│ (SQLAlchemy) │     │  (PDFs)     │     │  2.5-Flash    │
└──────────────┘     └─────────────┘     └───────────────┘
```

---

## 🚀 Tech Stack

**Backend**
- Python 3.12 + FastAPI
- Google Gemini 2.5 Flash (`google-generativeai`)
- SQLAlchemy + SQLite
- pdfplumber (text extraction)

**Frontend**
- React + Vite
- Tailwind CSS
- Lucide React (icons)
- Axios

---

## ⚡ Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (free tier available)

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 📊 AI Evaluation — 9 Pillars

TalentMatch evaluates every resume across 9 dimensions (0–10 each), producing a final score of 0–100:

| # | Pillar | Description |
|---|--------|-------------|
| 1 | Profile Fit | Alignment between candidate skills and job requirements |
| 2 | Work Experience | Career progression, tenure, and relevance |
| 3 | Academic Background | Degree relevance and certifications |
| 4 | Resume Quality | Clarity, structure, and grammar |
| 5 | Career Gaps | Identification of employment gaps |
| 6 | Professional Objective | Alignment with the open role |
| 7 | Availability | Remote/on-site logistics viability |
| 8 | Achievements | Metrics, KPIs, and quantified results |
| 9 | Chronological Coherence | Date consistency across work history |

---

## 🔒 Privacy & LGPD Compliance

TalentMatch was designed from the ground up with data privacy in mind:

- **Local Anonymization**: PII (CPF, email, phone, URLs, addresses) is stripped and replaced with tags like `[EMAIL_PROTECTED]` **before** the resume text is sent to any external API.
- **Two-Stage Multimodal**: For scanned PDFs, Gemini first transcribes and anonymizes the image — the scoring step only sees anonymized text.
- **Consent Checkbox**: Upload interface requires explicit user consent (LGPD legal basis).
- **Human Override**: All AI decisions can be reviewed and overridden by a human recruiter (LGPD Art. 20).
- **Audit Log**: A privacy log is stored per candidate, recording which data types were masked.

---

## 🗺️ Roadmap

- [ ] Migrate from SQLite to PostgreSQL
- [ ] Authentication & RBAC (recruiter roles)
- [ ] Audit trail for score overrides
- [ ] Email feedback to candidates (employer branding)
- [ ] Docker Compose for one-command deployment
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*MVP developed during the MEIU discipline at [UTFPR](https://www.utfpr.edu.br/), validated in partnership with a retail company.*
