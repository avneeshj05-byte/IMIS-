# INDUSTRIAL MAINTENANCE INTELLIGENCE SYSTEM (IMIS)

> **Tagline:** *Intelligent Diagnostics. Predictive Maintenance. Operational Reliability.*  
> **Classification:** Academic Major-Year B.Tech Computer Science Capstone Project  
> **Architecture:** IoT Telemetry Stream + Scikit-Learn Isolation Forest Anomaly Detection + Multi-Engine FAISS / Flat Cosine RAG + Industrial Diagnostic Synthesizer  

---

## 1. System Architecture

```
+-------------------------------------------------------------+
|                      IoT SENSOR LAYER                       |
|   M201 (CNC) | M202 (Press) | M203 (Comp) | M204 (Motor)    |
|   Parameters: Temp (°C), Vibration (mm/s), Press (bar), etc.|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                DATA INGESTION & MONITORING                  |
|     FastAPI Telemetry Stream (2-second sampling interval)   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                ML ANOMALY DETECTION ENGINE                  |
|       Scikit-Learn Isolation Forest (100 Estimators)        |
|          Parameter Attribution (Multivariate Z-Scores)      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  CENTRALIZED ALERT CENTER                   |
|     Alert Code Generation (ALT-*) & Criticality Rating      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     RAG RETRIEVAL ENGINE                    |
|    PyMuPDF Parser -> Semantic Chunking -> FAISS / Cosine    |
|    Vector Store -> Corroborating OEM Technical Excerpts     |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  LLM DIAGNOSTIC SYNTHESIZER                 |
|   Gemini 1.5 / OpenAI / Hugging Face / Grounded Synthesizer |
|        (Strictly grounded in OEM text; zero hallucination)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                ACTIONABLE MAINTENANCE OUTPUT                |
|    Probable Causes | Inspections | Step-by-Step SOP | LOTO  |
|          Source Transparency Citations & Confidence         |
+-------------------------------------------------------------+
```

---

## 2. Technology Stack

- **Backend:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic, SQLite (PostgreSQL compatible).
- **RAG & Vector Retrieval:** PyMuPDF (`fitz`), Normalized L2 Cosine Matrix Store (FAISS IndexFlatIP equivalent), Sublinear N-gram Semantic Vectorizer.
- **Machine Learning:** Scikit-Learn `IsolationForest` (contamination=0.05), NumPy, Pandas.
- **Diagnostics LLM:** Google Gemini 1.5 Flash REST API, OpenAI API, Hugging Face Serverless, and Local Industrial Grounded Rule Synthesizer.
- **Frontend / SCADA UI:** React 18, TypeScript, Tailwind CSS, Lucide icons, SCADA telemetry sparklines, IBM Plex typography.

---

## 3. Industrial Color Palette & Design Identity

- **Primary Background:** `#F3F4F2` (Clean engineering control console)
- **Secondary Background:** `#FFFFFF` (Panel surfaces)
- **Sidebar Background:** `#17251F` (SCADA high-contrast dark green)
- **Primary Accent:** `#315C49` (Industrial Forest Green)
- **Secondary Accent:** `#8DAA91` (Sage Green indicator)
- **Primary Text:** `#202A25` (High-contrast slate black)
- **Secondary Text:** `#737D76` (Technical metadata gray)
- **Warning Indicator:** `#D69A36` (Industrial Amber)
- **Critical Interlock:** `#B84C42` (Safety Red)
- **Borders & Dividers:** `#DDE2DD` (Thin structural lines)
- **Typography:** Inter / IBM Plex Sans for general interface; IBM Plex Mono for telemetry, error codes, and machine IDs.

---

## 4. Local Installation & Startup Guide (Windows)

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm (optional for Vite dev server, embedded production UI runs directly via FastAPI)

### Step 1: Clone or Navigate to Directory
```powershell
cd "C:\Users\WIN 10\.gemini\antigravity\scratch\imis"
```

### Step 2: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3: Start the Backend & Production SCADA Interface
From the project root:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 4: Open in Your Browser
- **IMIS Production Dashboard UI:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive Swagger REST API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

*(Optional) Start Vite React Development Server:*
```powershell
cd frontend
npm install
npm run dev
```

---

## 5. End-to-End Evaluation & Grading Walkthrough

Follow this 12-step script to demonstrate all project requirements during faculty evaluations:

1. **Open Overview Dashboard:** Navigate to [http://127.0.0.1:8000/](http://127.0.0.1:8000/). View the 5 industrial assets (`M201` CNC Milling, `M202` Hydraulic Press, `M203` Industrial Compressor, `M204` Conveyor Motor, `M205` Injection Moulding Machine), fleet health score (88.6%), active alerts, and real-time telemetry sparkline.
2. **Inspect Asset Details:** Select **B. ASSET MONITORING**. Click on **M204 - Conveyor Motor**. Review operating hours (3,140 hrs), plant criticality, nominal baseline limits, and live sensor snapshot.
3. **Inspect Document Knowledge Base:** Select **D. KNOWLEDGE BASE**. Notice the three pre-indexed synthetic OEM manuals (`M204_Conveyor_Motor_Technical_Manual.pdf`, `M201_CNC_Milling_Spindle_Manual.pdf`, `M202_Hydraulic_Press_SOP.pdf`). You can also upload any custom PDF manual to extract and index chunks in real time!
4. **Trigger Live Anomaly:** Click the top-right button **"Inject Anomaly"**. Select Machine **M204**, select fault **"Thermal Overheat"**, and click **Trigger Anomaly Event**.
5. **Observe ML Detection:** The Isolation Forest machine learning model scores the multivariate vector `[temperature, vibration, pressure, rpm, current]`, flags the thermal elevation ($Z > 8.0$), and logs an open Anomaly Event.
6. **Inspect Alert Center:** Navigate to **G. ALERT CENTER**. Observe the new critical alert raised for `M204` (`ALT-2026-104`).
7. **One-Click AI Investigation:** On the alert row, click the green button **"AI →"**. The system deep-links to **C. AI DIAGNOSTICS**, pre-populating the machine context and diagnostic query.
8. **Execute RAG Retrieval:** Click **"Execute Diagnostic Retrieval"** (or use the sample prompt for Error E17).
9. **Examine Diagnostic Output:**
   - **DIAGNOSTIC SUMMARY:** Contextual engineering breakdown of the thermal rise.
   - **PROBABLE CAUSES:** Document-corroborated factors (drive pulley bearing race galling in 6308-2RS ball bearings, belt friction, fan obstruction).
   - **RECOMMENDED INSPECTIONS:** True-RMS clamp meter current checks, thermographic scan, free rotation check.
   - **STEP-BY-STEP TROUBLESHOOTING:** Prescribed OEM repair procedure with bearing replacement specs (SKF 6308 C3) and synthetic polyurea grease (Mobil Polyrex EM).
   - **MANDATORY SAFETY PRECAUTIONS:** Lockout/Tagout (LOTO 29 CFR 1910.147) and zero energy verification.
   - **SOURCE TRANSPARENCY CITATIONS:** Verifiable references to OEM Manual Page 2, complete with cosine similarity scores and original text excerpts.
   - **CONFIDENCE LEVEL:** Calibrated confidence indicator (HIGH/MEDIUM) based on semantic convergence.
10. **Record Maintenance Intervention:** Click **"Record Maintenance Action →"**. Fill in the corrective measures taken and click **"Save Maintenance Record"**.
11. **Review Historical Logs:** Navigate to **F. MAINTENANCE LOGS**. The newly logged maintenance entry is immediately archived and searchable by future RAG diagnostic queries!
12. **Explore Sensor Analytics:** Navigate to **E. SENSOR ANALYTICS**. Review real-time technical trendlines for Temperature, Vibration, Pressure, and Motor Current with threshold alarm boundaries.
