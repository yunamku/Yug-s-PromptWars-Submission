import os
import json
import logging
import httpx
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
# Setup logging first so we can output startup debug info
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexus-backend")

from dotenv import load_dotenv
from app.simulation import StadiumSimulation

# Load environment variables from app/.env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

# Verify startup environment variables
key_on_startup = os.environ.get("GEMINI_API_KEY")
logger.info(f"STARTUP DEBUG: Looking for .env at: {os.path.abspath(dotenv_path)}")
logger.info(f"STARTUP DEBUG: .env file exists on disk: {os.path.exists(dotenv_path)}")
logger.info(f"STARTUP DEBUG: GEMINI_API_KEY exists on startup: {bool(key_on_startup)}")

app = FastAPI(title="Feel FIFA Nexus API", version="1.0.0")

# Enable CORS for external testing/cross-origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the live simulation
sim = StadiumSimulation()

# Get Gemini API key from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

class ShiftPayload(BaseModel):
    from_zone: str
    to_zone: str
    count: int

class IncidentPayload(BaseModel):
    zone: str
    severity: str
    description: str

class ChatPayload(BaseModel):
    message: str

def clean_gemini_json(text: str) -> str:
    """Helper to clean markdown syntax from Gemini JSON outputs if present."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def get_rule_based_alerts(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Local decision engine that generates high-fidelity suggestions when Gemini is offline."""
    zones = state["zones"]
    
    # Sort zones by congestion
    congested_zones = sorted(
        [z for z in zones.values() if z["congestion"] > 60],
        key=lambda x: x["congestion"],
        reverse=True
    )
    understaffed_zones = sorted(
        [z for z in zones.values() if z["congestion"] < 40 and z["staff_count"] > 8],
        key=lambda x: x["congestion"]
    )
    
    alerts = []
    
    # Generate shifting alerts
    for i in range(min(len(congested_zones), len(understaffed_zones))):
        target = congested_zones[i]
        source = understaffed_zones[i]
        
        # Determine number of volunteers to shift
        shift_count = 3
        if target["congestion"] > 85:
            shift_count = 5
            
        alerts.append({
            "id": f"alert_rule_{i+1}",
            "title": f"Shift Staff to {target['name']}",
            "description": f"Move {shift_count} volunteers from {source['name']} (congestion: {source['congestion']}%) to {target['name']} (congestion: {target['congestion']}%). This will reduce the estimated {target['queue_time']} min queue time.",
            "severity": "High" if target["congestion"] > 80 else "Medium",
            "source_zone": source["name"],
            "target_zone": target["name"],
            "count": shift_count,
            "engine": "KITMAN Offline Advisory"
        })
        
    # Also add alerts for active incidents
    for idx, inc in enumerate(state["incidents"]):
        alerts.append({
            "id": f"alert_inc_{idx+1}",
            "title": f"Incident Response: {inc['zone']}",
            "description": f"Deploy technical/security unit to {inc['zone']} immediately to address: '{inc['description']}'",
            "severity": inc["severity"],
            "source_zone": "",
            "target_zone": inc["zone"],
            "count": 0,
            "engine": "Incident Safety Protocol"
        })
        
    return alerts

@app.get("/api/telemetry")
def get_telemetry():
    """Returns the current state of the stadium sensors, logs, and incidents."""
    return sim.get_state()

@app.post("/api/shift")
def shift_staff(payload: ShiftPayload):
    """Allows manual shifting of staff/volunteers between zones."""
    # Find matching zones by checking substring
    target_from = None
    target_to = None
    
    for name in sim.zones.keys():
        if payload.from_zone.lower() in name.lower():
            target_from = name
        if payload.to_zone.lower() in name.lower():
            target_to = name
            
    if not target_from or not target_to:
        raise HTTPException(
            status_code=400, 
            detail=f"Zone match failed. Searched for: '{payload.from_zone}' -> {target_from}, '{payload.to_zone}' -> {target_to}"
        )
        
    success = sim.shift_staff(target_from, target_to, payload.count)
    if success:
        return {"status": "success", "message": f"Successfully shifted {payload.count} staff from {target_from} to {target_to}."}
    else:
        raise HTTPException(status_code=400, detail=f"Insufficient staff in {target_from} (has {sim.zones[target_from]['staff_count']}).")

@app.post("/api/incident/create")
def create_incident(payload: IncidentPayload):
    """Triggers an incident manually, affecting simulation metrics."""
    target_zone = None
    for name in sim.zones.keys():
        if payload.zone.lower() in name.lower():
            target_zone = name
            break
            
    if not target_zone:
         raise HTTPException(status_code=400, detail=f"Zone '{payload.zone}' not found.")
         
    incident = sim.add_incident(target_zone, payload.severity, payload.description)
    return {"status": "success", "incident": incident}

@app.post("/api/incident/resolve/{inc_id}")
def resolve_incident(inc_id: str):
    """Marks an active incident as resolved."""
    success = sim.resolve_incident(inc_id)
    if success:
        return {"status": "success", "message": f"Incident {inc_id} resolved."}
    raise HTTPException(status_code=404, detail="Incident ID not found.")

class BinPayload(BaseModel):
    bin_name: str

class LiftPayload(BaseModel):
    lift_name: str
    status: str

@app.post("/api/bin/empty")
def empty_bin(payload: BinPayload):
    """Allows janitorial staff to empty a smart trash bin."""
    success = sim.empty_bin(payload.bin_name)
    if success:
        return {"status": "success", "message": f"Smart bin '{payload.bin_name}' has been successfully emptied."}
    raise HTTPException(status_code=400, detail=f"Bin '{payload.bin_name}' not found.")

@app.post("/api/lift/toggle")
def toggle_lift(payload: LiftPayload):
    """Allows operations to toggle elevator operational status for testing detours."""
    success = sim.toggle_lift(payload.lift_name, payload.status)
    if success:
        return {"status": "success", "message": f"Elevator '{payload.lift_name}' marked as {payload.status.upper()}."}
    raise HTTPException(status_code=400, detail=f"Elevator '{payload.lift_name}' not found.")

@app.get("/api/alerts")
async def get_alerts():
    """Gemini-powered decision support. Analyzes telemetry JSON and suggests re-allocations."""
    state = sim.get_state()
    
    # Reload environment variables dynamically to pick up any runtime updates to the .env file
    load_dotenv(dotenv_path, override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set in environment or app/.env. Falling back to local advisory.")
        return get_rule_based_alerts(state)
        
    # Prepare telemetry JSON for prompt
    telemetry_summary = {
        "attendance": state["attendance"],
        "capacity": state["capacity"],
        "active_incidents": state["incidents"],
        "zones": {
            name: {
                "type": z["type"],
                "congestion": z["congestion"],
                "queue_time": z["queue_time"],
                "staff": z["staff_count"],
                "status": z["status"]
            }
            for name, z in state["zones"].items()
        },
        "elevators": state["lifts"],
        "waste_bins": state["smart_bins"],
        "transit_lines": state["transit_lines"],
        "fixtures": [
            {
                "group": m["group"],
                "team1": m["team1"],
                "team2": m["team2"],
                "score1": m["score1"],
                "score2": m["score2"],
                "status": m["status"],
                "minute": m["minute"]
            }
            for m in state["matches"]
        ]
    }
    
    prompt = f"""
You are KITMAN, the GenAI Tactical Operations Intelligence Engine for Feel FIFA Nexus at the FIFA World Cup 2026. Analyze the following live venue telemetry and active incidents as if they were match statistics:
{json.dumps(telemetry_summary, indent=2)}

Tasks:
1. Identify the top 2-3 venue bottlenecks based on congestion, queue times, elevator closures, full trash bins, or transit delays.
2. Suggest actionable resource re-allocations of staff/volunteers to solve these bottlenecks:
   - If a gate or metro is highly congested, suggest shifting staff from an under-utilized gate.
   - If Elevator 3 (Section 102) is OFFLINE, suggest deploying 2 staff there immediately to assist wheelchair detours.
   - If a smart waste bin is > 85%, suggest dispatching a cleanup crew.
   - If a transit line is delayed or crowded, suggest transport loop holding advisors.
3. Every suggestion should shift staff from a zone with low/normal congestion and high staff to a zone with high/critical congestion.
4. Format your output strictly as a JSON array of alerts matching the schema below.

Output JSON Schema:
[
  {{
    "id": "alert_1",
    "title": "Shift Staff to [Target Zone Name]",
    "description": "Shift [X] volunteers from [Source Zone Name] to [Target Zone Name] to resolve [issue details].",
    "severity": "[High|Medium|Low]",
    "source_zone": "[Exact key name from the telemetry, e.g. Gate D or Section 204 (F&B)]",
    "target_zone": "[Exact key name from the telemetry, e.g. Gate C or Metro Stadium East]",
    "count": [X],
    "engine": "KITMAN Tactical Advisory"
  }}
]

Important Guidelines:
- Ensure the 'source_zone' and 'target_zone' values match the exact keys from the telemetry (e.g., "Gate A", "Gate B", "Gate C", "Gate D", "Section 102 (F&B)", "Section 204 (F&B)", "Metro Stadium East", "Metro Stadium West").
- Suggest re-allocations that are mathematically possible (e.g. do not shift 10 staff from a zone that only has 5 staff).
- Provide ONLY the raw JSON string starting with [ and ending with ]. Do not wrap it in markdown code block ticks.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=6.0)
            if response.status_code != 200:
                logger.error(f"Gemini API returned error code {response.status_code}: {response.text}")
                raise Exception(f"Gemini API returned status code {response.status_code}")
                
            res_data = response.json()
            gemini_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned_text = clean_gemini_json(gemini_text)
            
            # Verify it's parseable JSON
            parsed_alerts = json.loads(cleaned_text)
            return parsed_alerts
    except Exception as e:
        logger.error(f"Failed to generate Gemini alerts: {str(e)}. Falling back to local advisory.")
        alerts = get_rule_based_alerts(state)
        # Prepend a warning alert to notify user of fallback status
        alerts.insert(0, {
            "id": "api_warning",
            "title": "Gemini API Offline Fallback",
            "description": f"The Gemini AI Advisor is currently offline or rate-limited ({str(e)}). Operating on local rule-based backup advisory.",
            "severity": "Medium",
            "source_zone": "",
            "target_zone": "",
            "count": 0,
            "engine": "KITMAN Offline Backup"
        })
        return alerts

@app.post("/api/chat")
async def chat_kitman(payload: ChatPayload):
    """Interactive KITMAN GenAI chat. Answers queries strictly based on current telemetry."""
    state = sim.get_state()
    user_msg = payload.message
    
    # Format telemetry for Gemini
    telemetry_str = json.dumps({
        "attendance": state["attendance"],
        "capacity": state["capacity"],
        "active_incidents": state["incidents"],
        "zones": {
            name: {
                "type": z["type"],
                "congestion": z["congestion"],
                "queue_time": z["queue_time"],
                "staff": z["staff_count"],
                "status": z["status"],
                "description": z["description"]
            }
            for name, z in state["zones"].items()
        },
        "elevators": state["lifts"],
        "smart_waste_bins": state["smart_bins"],
        "transit_lines": state["transit_lines"],
        "match_fixtures": state["matches"]
    }, indent=2)
    
    # Reload environment variables dynamically to pick up any runtime updates to the .env file
    load_dotenv(dotenv_path, override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "")
    
    def get_offline_response(note: str = "") -> dict:
        msg_lower = user_msg.lower()
        prefix = f"⚠️ **Note:** {note}\n\n" if note else ""
        
        # Transit
        if "transit" in msg_lower or "train" in msg_lower or "bus" in msg_lower or "metro" in msg_lower:
            transit_summary = "\n".join([f"- **{name}**: Load: {t['load']}%, Status: {t['status']}, Delay: {t['delay']}m" for name, t in state["transit_lines"].items()])
            reply = f"{prefix}🚆 **Transit Advisory:** Current transport network load status:\n{transit_summary}\n\nI recommend security teams hold outbound crowds at Gate C if Metro East crowding exceeds critical limits."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Accessibility / Lifts
        elif "lift" in msg_lower or "elevator" in msg_lower or "access" in msg_lower or "disabled" in msg_lower:
            lift_summary = "\n".join([f"- **{name}**: {status}" for name, status in state["lifts"].items()])
            reply = f"{prefix}♿ **Accessibility Detour Advisory:** Elevator status registers:\n{lift_summary}\n\nSince **Elevator 3 (Section 102) is OFFLINE**, please route wheelchair guests arriving at Gate C through the West Ramp route to F&B Section 204."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Sustainability / Waste Bins
        elif "bin" in msg_lower or "waste" in msg_lower or "trash" in msg_lower or "clean" in msg_lower:
            bin_summary = "\n".join([f"- **{name}**: {val}% filled" for name, val in state["smart_bins"].items()])
            reply = f"{prefix}♻️ **Sustainability green report:** Smart waste bins level logs:\n{bin_summary}\n\nBin **Bin Gate C** is at **95%** capacity. Clean-up crew dispatched."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Matches / Schedule
        elif "match" in msg_lower or "schedule" in msg_lower or "fixture" in msg_lower or "score" in msg_lower:
            match_summary = "\n".join([f"- **{m['team1']} vs {m['team2']}**: {m['score1']}-{m['score2']} ({m['status']}, {m['minute']}m)" for m in state["matches"]])
            reply = f"{prefix}⚽ **Fixture Schedule Board:** World Cup 2026 Stadium Schedule:\n{match_summary}"
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Most congested
        elif "congest" in msg_lower or "crowd" in msg_lower or "busy" in msg_lower or "bottleneck" in msg_lower:
            most_congested = max(state["zones"].items(), key=lambda x: x[1]["congestion"])
            least_congested = min(state["zones"].items(), key=lambda x: x[1]["congestion"])
            reply = f"{prefix}🚨 **Offline Analysis:** The highest congestion is currently at **{most_congested[0]}** ({most_congested[1]['congestion']}% congestion, {most_congested[1]['queue_time']} mins queue). The lowest congestion is at **{least_congested[0]}** ({least_congested[1]['congestion']}%). I recommend re-allocating staff to {most_congested[0]} to support security and ticket flows."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Incidents
        elif "incident" in msg_lower or "problem" in msg_lower or "alert" in msg_lower or "offline" in msg_lower:
            if state["incidents"]:
                inc_list = "\n".join([f"- **{inc['zone']}**: {inc['description']} (Severity: {inc['severity']})" for inc in state["incidents"]])
                reply = f"{prefix}🔧 **Offline Analysis:** There are currently **{len(state['incidents'])} active incidents**:\n{inc_list}\n\nTechnical crews have been flagged."
            else:
                reply = f"{prefix}✅ **Offline Analysis:** No active incidents reported in the stadium. All telemetry nodes are reporting within nominal ranges."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # Staff/volunteers
        elif "staff" in msg_lower or "volunteer" in msg_lower or "allocate" in msg_lower or "shift" in msg_lower:
            staff_summary = "\n".join([f"- **{name}**: {z['staff_count']} staff" for name, z in state["zones"].items()])
            reply = f"{prefix}👥 **Offline Analysis:** Staffing distribution across zones:\n{staff_summary}\n\nYou can click the 'Shift' button in the dashboard grid or ask me to shift them."
            return {"reply": reply, "engine": "KITMAN Offline Engine"}
            
        # General response
        else:
            reply = (
                f"{prefix}👋 **KITMAN (Offline Mode):**\n"
                f"I am running in offline fallback mode.\n\n"
                f"Snapshot of the venue:\n"
                f"- **Attendance:** {state['attendance']:,} / {state['capacity']:,} fans in stadium.\n"
                f"- **Active Incidents:** {len(state['incidents'])}\n"
                f"- **Elevators Offline:** {[k for k, v in state['lifts'].items() if v == 'Offline']}\n"
                f"- **Transit Delay:** {state['transit_lines']['Shuttle Bus Loop B']['delay']}m on Shuttle B\n\n"
                f"Ask me about transit, accessibility, smart bins, match schedules, congestion, or incidents!"
            )
            return {"reply": reply, "engine": "KITMAN Offline Engine"}

    if not api_key:
        logger.error("GEMINI_API_KEY is not set. Falling back to offline chat.")
        return get_offline_response("Gemini API key is not configured.")

    # If key is available, call Gemini API
    prompt = f"""
You are "KITMAN", a premium real-time tactical operations and resource analyst for venue staff at the FIFA World Cup 2026. Formulate your answers with the precision of a professional Head Coach analyzing match logistics.
You are given the following live venue telemetry and logs:
<telemetry>
{telemetry_str}
</telemetry>

Current local time is: 2026-07-07T00:17:54+05:30.

Instructions:
1. Answer the user's query strictly based on the provided live telemetry, elevator statuses, transit delays, smart bin fill rates, and active incidents.
2. Be extremely concise, direct, and operational. Staff members are in a high-stress, fast-paced environment and need quick, clear answers.
3. Highlight critical issues (e.g. congestion > 80%, elevators offline, smart bins > 85% full, or delayed trains).
4. If the query is not related to stadium operations or cannot be answered with the telemetry, politely decline to answer, explaining that you only have access to current venue operations data.

User Query: "{user_msg}"
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=6.0)
            if response.status_code != 200:
                raise Exception(f"Gemini API returned status code {response.status_code}")
                
            res_data = response.json()
            reply = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return {"reply": reply, "engine": "KITMAN (Gemini 1.5 Flash)"}
    except Exception as e:
        logger.error(f"Gemini API failed: {str(e)}. Falling back to offline chat.")
        return get_offline_response("Gemini API is unavailable (rate-limited or offline).")

# Mount static files at root
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
