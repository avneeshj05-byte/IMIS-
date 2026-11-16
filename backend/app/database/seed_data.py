import os
import json
import fitz  # PyMuPDF to generate synthetic demonstration PDFs directly!
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.database import Machine, MaintenanceRecord, Alert, Document, DocumentChunk
from backend.app.services.document_processor import DocumentProcessor
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store

def create_synthetic_manual_pdf(file_path: str, title: str, pages_text: list):
    """Generate a clean, high-density industrial technical PDF document using PyMuPDF."""
    doc = fitz.open()
    for p_num, content in enumerate(pages_text):
        page = doc.new_page(width=595, height=842) # A4 format
        # Draw header banner
        page.draw_rect(fitz.Rect(36, 36, 559, 72), color=(0.19, 0.36, 0.28), fill=(0.19, 0.36, 0.28))
        page.insert_text(fitz.Point(46, 58), "IMIS TECHNICAL SPECIFICATION & OEM REPAIR MANUAL", fontsize=11, color=(1, 1, 1))
        
        # Document Title & Page Number
        page.insert_text(fitz.Point(36, 95), f"{title} - Page {p_num + 1}", fontsize=14, color=(0.12, 0.16, 0.14))
        page.insert_text(fitz.Point(480, 95), f"REV 2.4", fontsize=10, color=(0.45, 0.49, 0.46))
        
        # Draw horizontal dividing line
        page.draw_line(fitz.Point(36, 105), fitz.Point(559, 105), color=(0.86, 0.88, 0.86), width=1)
        
        # Insert body text inside text box
        rect = fitz.Rect(36, 120, 559, 780)
        page.insert_textbox(rect, content, fontsize=9.5, lineheight=1.4, color=(0.12, 0.16, 0.14))
        
        # Footer
        page.draw_line(fitz.Point(36, 790), fitz.Point(559, 790), color=(0.86, 0.88, 0.86), width=1)
        page.insert_text(fitz.Point(36, 808), "STRICTLY FOR AUTHORIZED MAINTENANCE PERSONNEL - LOCKOUT/TAGOUT REQUIRED", fontsize=8, color=(0.72, 0.30, 0.26))
        page.insert_text(fitz.Point(490, 808), f"Page {p_num + 1} of {len(pages_text)}", fontsize=8, color=(0.45, 0.49, 0.46))

    doc.save(file_path)
    doc.close()

def seed_synthetic_documents(db: Session):
    """Generate realistic demonstration technical manuals and index them into the vector database."""
    doc_processor = DocumentProcessor()
    
    manuals = [
        {
            "filename": "M204_Conveyor_Motor_Technical_Manual.pdf",
            "title": "M204 CONVEYOR DRIVE MOTOR OEM SERVICE MANUAL",
            "type": "TECHNICAL_MANUAL",
            "pages": [
                """SECTION 1: EQUIPMENT OVERVIEW & NOMINAL OPERATING RANGES
Asset ID: M204 (Three-Phase AC Asynchronous Motor, 15kW, 400V, 50Hz, 1480 RPM).
Department: Assembly Line 2 - Main Material Handling.
Nominal Motor Casing Temperature: 55°C to 65°C.
Maximum Permissible Continuous Temperature: 80.0°C.
Tripping Alarm Threshold: 85.0°C.
Vibration Tolerance: Below 4.2 mm/s RMS (ISO 10816-3 Class II Rigid Mount).

SECTION 2: ERROR CODE E17 DIAGNOSTIC MATRIX
Error Code E17 designates 'Motor Thermal Overload & Abnormal Winding Rise'.
Observed Condition: Motor temperature elevates rapidly above nominal baseline (e.g., 18% increase over 2 hours).

Probable Causes of Error E17:
1. Drive pulley bearing race galling and grease starvation in 6308-2RS deep groove ball bearings.
2. High mechanical conveyor belt drag caused by roller bearing seizure or foreign debris in belt guide channels.
3. Obstructed ventilation cowlings or dust buildup on motor cooling fins reducing heat dissipation.
4. Single-phasing or abnormal voltage imbalance causing stator phase current to spike above 18.0 Amperes.

Recommended Inspections:
- Step A: Verify motor free rotation by disengaging the drive coupling and turning shaft manually.
- Step B: Measure three-phase current balance using a calibrated True-RMS clamp meter.
- Step C: Thermographic scan of drive-end and non-drive-end bearing housings to isolate friction source.
- Step D: Inspect cooling fan impellers for broken blades or shroud clogging.""",

                """SECTION 3: STEP-BY-STEP TROUBLESHOOTING & REPAIR PROCEDURE FOR E17
When Error E17 is logged by the PLC:
1. Execute OSHA Lockout/Tagout (LOTO 29 CFR 1910.147). Disconnect main 400V feeder at Panel MCC-4.
2. Allow motor surface to cool below 45°C before handling.
3. Clean cooling fins with dry compressed air (< 30 PSI) to restore thermal convection.
4. If bearing acoustic signature exhibits grinding or vibration exceeds 4.2 mm/s RMS:
   a. Extract motor drive-end bearing using mechanical three-jaw puller.
   b. Inspect shaft journal for fretting corrosion.
   c. Install replacement SKF 6308 C3 bearing using induction bearing heater (110°C).
   d. Pack bearing housing with Mobil Polyrex EM synthetic polyurea grease (35 grams).
5. Reassemble drive coupling and check laser shaft alignment (angular offset < 0.05 mm).
6. Clear fault register E17 on VFD control panel and run motor under no-load condition for 20 minutes.

SAFETY PRECAUTIONS:
- Always verify zero energy state with a certified voltage tester prior to touching terminal block.
- Wear safety glasses, thermal gloves, and steel-toe footwear during bearing removal."""
            ]
        },
        {
            "filename": "M201_CNC_Milling_Spindle_Manual.pdf",
            "title": "M201 5-AXIS CNC MILLING SPINDLE SERVICE SPECIFICATION",
            "type": "TECHNICAL_MANUAL",
            "pages": [
                """SECTION 1: SPINDLE TOLERANCES & ERROR E04
Asset ID: M201 - 5-Axis Vertical Machining Center. Spindle Speed: 0 to 12,000 RPM.
Error Code E04 indicates 'Spindle Harmonic Vibration Imbalance & Bearing Runout'.

Probable Causes of Error E04:
1. Toolholder taper contamination (chips or coolant residue inside HSK-A63 taper).
2. Spindle ceramic hybrid angular contact bearing preload loss or raceway flaking.
3. Unbalanced cutting tool assembly running at speeds exceeding 6,000 RPM.
4. Drawbar collet spring fatigue causing improper pull-stud retention force (< 12 kN).

Recommended Inspections:
- Inspect HSK-A63 spindle taper bore using an illuminated inspection mirror.
- Measure spindle radial runout at tool nose with 0.001mm dial test indicator.
- Verify drawbar clamping retention force with digital force gauge (Nominal: 14.5 kN).
- Perform FFT vibration spectrum analysis to check 1X and 2X rotational frequency peaks.""",

                """SECTION 2: CORRECTIVE SOP FOR SPINDLE REPAIR
1. Clean spindle taper with solvent-wetted brass taper wiper.
2. Dynamically balance tool assemblies on tool pre-setter to G2.5 at 12,000 RPM.
3. If vibration persists above 4.5 mm/s RMS, replace drawbar Belleville disc spring stack.
4. Recalibrate spindle chiller circuit temperature setpoint (20.0°C ± 0.5°C)."""
            ]
        },
        {
            "filename": "M202_Hydraulic_Press_SOP.pdf",
            "title": "M202 300-TON HYDRAULIC PRESS MAINTENANCE SOP",
            "type": "SOP",
            "pages": [
                """SECTION 1: HYDRAULIC SYSTEM OVERVIEW & ERROR E88
Asset ID: M202 - Hydraulic Forming Press. Nominal Pressure: 160.0 bar.
Error Code E88 designates 'Hydraulic Pressure Attenuation / Proportional Relief Valve Fault'.

Probable Causes:
1. Proportional relief valve spool sticking due to hydraulic oil contamination (ISO 4406 > 19/17/14).
2. Piston seal extrusion or cylinder gland leakage causing internal fluid bypass.
3. Suction line cavitation caused by clogged 10-micron return line filter element.
4. Main axial piston pump swashplate bearing wear.

Recommended Inspections & Corrective Actions:
- Check hydraulic reservoir sight glass for fluid foaming or emulsion.
- Test main relief valve pilot pressure with 0-250 bar calibrated glycerine gauge.
- Replace hydraulic filter cartridge (Part # HYD-FLT-882).
- Top up with ISO VG 46 anti-wear hydraulic oil."""
            ]
        }
    ]

    # Check existing documents
    existing = db.query(Document).all()
    if existing:
        return

    vector_store.clear()
    all_chunks_metadata = []
    all_chunks_text = []

    for manual in manuals:
        pdf_path = os.path.join(settings.SAMPLE_DOCS_DIR, manual["filename"])
        create_synthetic_manual_pdf(pdf_path, manual["title"], manual["pages"])

        # Process document
        chunks = doc_processor.process_file(pdf_path, manual["filename"])

        db_doc = Document(
            filename=manual["filename"],
            original_name=manual["filename"],
            file_path=pdf_path,
            file_size=os.path.getsize(pdf_path),
            page_count=len(manual["pages"]),
            chunk_count=len(chunks),
            document_type=manual["type"],
            status="INDEXED",
            summary=f"Official maintenance documentation for {manual['title']}. Covers diagnostic error codes and SOP procedures."
        )
        db.add(db_doc)
        db.flush()

        for c in chunks:
            chunk_obj = DocumentChunk(
                document_id=db_doc.id,
                chunk_index=c["chunk_index"],
                page_number=c["page_number"],
                content=c["content"],
                metadata_json=json.dumps({"document_name": manual["filename"], "page": c["page_number"]})
            )
            db.add(chunk_obj)

            meta = {
                "document_id": db_doc.id,
                "document_name": manual["filename"],
                "page_number": c["page_number"],
                "chunk_index": c["chunk_index"],
                "content": c["content"]
            }
            all_chunks_metadata.append(meta)
            all_chunks_text.append(c["content"])

    # Embed and add to vector store
    if all_chunks_text:
        vectors = embedding_service.embed_documents(all_chunks_text)
        vector_store.add_chunks(vectors, all_chunks_metadata)

    db.commit()


def seed_database(db: Session):
    """Seed industrial machines, historical maintenance records, and baseline alerts."""
    # Check if already seeded
    if db.query(Machine).first():
        return

    machines = [
        Machine(
            id="M201",
            name="CNC Milling Machine",
            machine_type="5-Axis Vertical Machining Center",
            department="Precision Machining Bay A",
            installation_date="2021-04-15",
            status="OPERATIONAL",
            health_score=94.2,
            last_maintenance="2026-10-18",
            next_maintenance="2026-12-18",
            operating_hours=4210.5,
            criticality="HIGH",
            temp_min=45.0, temp_max=78.0,
            vib_max=4.5, press_min=4.5, press_max=7.5,
            rpm_nominal=3200.0, current_max=22.0
        ),
        Machine(
            id="M202",
            name="Hydraulic Press",
            machine_type="300-Ton Forging Press",
            department="Forming & Stamping",
            installation_date="2019-11-03",
            status="OPERATIONAL",
            health_score=91.8,
            last_maintenance="2026-09-24",
            next_maintenance="2026-11-24",
            operating_hours=6890.0,
            criticality="HIGH",
            temp_min=40.0, temp_max=75.0,
            vib_max=4.0, press_min=130.0, press_max=185.0,
            rpm_nominal=1200.0, current_max=28.0
        ),
        Machine(
            id="M203",
            name="Industrial Compressor",
            machine_type="Rotary Screw Compressor",
            department="Pneumatic Utilities",
            installation_date="2020-08-20",
            status="OPERATIONAL",
            health_score=88.5,
            last_maintenance="2026-10-05",
            next_maintenance="2026-12-05",
            operating_hours=5120.2,
            criticality="MEDIUM",
            temp_min=55.0, temp_max=92.0,
            vib_max=5.2, press_min=6.5, press_max=10.0,
            rpm_nominal=2950.0, current_max=38.0
        ),
        Machine(
            id="M204",
            name="Conveyor Motor",
            machine_type="Three-Phase AC Drive Motor 15kW",
            department="Assembly Line 2",
            installation_date="2022-02-14",
            status="MAINTENANCE",
            health_score=72.4,
            last_maintenance="2026-10-29",
            next_maintenance="2026-11-15",
            operating_hours=3140.0,
            criticality="HIGH",
            temp_min=45.0, temp_max=80.0,
            vib_max=4.2, press_min=2.0, press_max=4.5,
            rpm_nominal=1480.0, current_max=18.0
        ),
        Machine(
            id="M205",
            name="Injection Moulding Machine",
            machine_type="180-Ton Hydraulic/Electric Hybrid",
            department="Polymer Processing Bay B",
            installation_date="2023-01-10",
            status="OPERATIONAL",
            health_score=96.0,
            last_maintenance="2026-10-12",
            next_maintenance="2026-12-12",
            operating_hours=2105.8,
            criticality="MEDIUM",
            temp_min=50.0, temp_max=95.0,
            vib_max=4.8, press_min=115.0, press_max=165.0,
            rpm_nominal=1450.0, current_max=34.0
        )
    ]
    for m in machines:
        db.add(m)

    # Historical Maintenance Logs
    records = [
        MaintenanceRecord(
            machine_id="M204",
            maintenance_date="2026-10-29",
            reported_issue="Motor temperature rise and high-frequency acoustic squeal on drive pulley",
            error_code="E17",
            root_cause="Drive pulley bearing race galling due to high ambient dust and grease breakdown",
            corrective_action="Flushed bearing housing, replaced deep-groove ball bearings with SKF 6308 C3, re-lubricated with Mobil Polyrex EM.",
            technician_notes="Temperature stabilized at 58.4°C after 1-hour load test. Vibration dropped from 4.8 mm/s to 1.9 mm/s.",
            technician_name="R. Vance (Senior Mechanical Tech)",
            downtime_hours=2.5,
            resolution_status="RESOLVED"
        ),
        MaintenanceRecord(
            machine_id="M201",
            maintenance_date="2026-10-18",
            reported_issue="Spindle vibration harmonic alarm during 8000 RPM contouring pass",
            error_code="E04",
            root_cause="Chips inside HSK-A63 taper causing toolholder eccentricity runout of 0.018mm",
            corrective_action="Cleaned spindle taper bore with brass wiper, recalibrated drawbar retention force to 14.5 kN.",
            technician_notes="Runout measured at 0.002mm at spindle nose. Test cut in 7075 aluminum within tolerance.",
            technician_name="K. Sato (Spindle Specialist)",
            downtime_hours=1.8,
            resolution_status="RESOLVED"
        ),
        MaintenanceRecord(
            machine_id="M202",
            maintenance_date="2026-09-24",
            reported_issue="Hydraulic pressure dropping below 135 bar during tonnage dwell cycle",
            error_code="E88",
            root_cause="Proportional relief valve spool sticking caused by particulate varnish in oil",
            corrective_action="Replaced proportional valve spool assembly, swapped 10-micron return filter, performed oil filtration sweep.",
            technician_notes="Pressure response verified at 160 bar. ISO cleanliness code restored to 16/14/11.",
            technician_name="M. Miller (Fluid Power Engineer)",
            downtime_hours=4.0,
            resolution_status="RESOLVED"
        ),
        MaintenanceRecord(
            machine_id="M203",
            maintenance_date="2026-10-05",
            reported_issue="Compressor oil separator differential pressure high alarm",
            error_code="E12",
            root_cause="Saturated oil coalescing filter element and oil foaming",
            corrective_action="Replaced oil separator cartridge and replenished compressor synthetic coolant.",
            technician_notes="Discharge pressure steady at 8.5 bar. Differential pressure normal at 0.2 bar.",
            technician_name="D. Chen (Utilities Technician)",
            downtime_hours=1.5,
            resolution_status="RESOLVED"
        )
    ]
    for r in records:
        db.add(r)

    # Initial Alerts
    alerts = [
        Alert(
            alert_code="ALT-2026-104",
            machine_id="M204",
            category="Temperature Anomaly",
            severity="CRITICAL",
            description="Machine M204 motor temperature elevated by 18% over the last two hours (Observed: 78.4°C, Limit: 80.0°C).",
            status="NEW"
        ),
        Alert(
            alert_code="ALT-2026-098",
            machine_id="M201",
            category="Vibration Anomaly",
            severity="WARNING",
            description="CNC spindle vibration harmonic elevation detected at 3.9 mm/s RMS (Baseline: 2.1 mm/s).",
            status="ACKNOWLEDGED"
        ),
        Alert(
            alert_code="ALT-2026-085",
            machine_id="M203",
            category="Scheduled Maintenance",
            severity="INFO",
            description="Compressor 5000-hour comprehensive valve overhaul scheduled in 22 operating days.",
            status="NEW"
        )
    ]
    for a in alerts:
        db.add(a)

    db.commit()

    # Also seed synthetic documentation
    seed_synthetic_documents(db)
