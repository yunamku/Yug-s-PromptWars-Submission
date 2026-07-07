import random
import time
import math
from typing import Dict, List, Any

class StadiumSimulation:
    def __init__(self):
        self.start_time = time.time()
        self.total_capacity = 80000
        self.attendance = 68450
        
        # Initial setup of zones
        self.zones = {
            "Gate A": {
                "id": "gate_a",
                "name": "Gate A (Main Entrance)",
                "type": "gate",
                "status": "Open",
                "base_congestion": 65.0,
                "congestion": 65.0,
                "queue_time": 18,
                "staff_count": 12,
                "description": "Primary gate connecting directly to the main parking lot."
            },
            "Gate B": {
                "id": "gate_b",
                "name": "Gate B (North Entrance)",
                "type": "gate",
                "status": "Open",
                "base_congestion": 40.0,
                "congestion": 40.0,
                "queue_time": 8,
                "staff_count": 14,
                "description": "Secondary gate used mainly by bus arrivals."
            },
            "Gate C": {
                "id": "gate_c",
                "name": "Gate C (VIP & West Entrance)",
                "type": "gate",
                "status": "Open",
                "base_congestion": 80.0,
                "congestion": 80.0,
                "queue_time": 28,
                "staff_count": 8,
                "description": "High-traffic gate near premium lounges and hospitality suites."
            },
            "Gate D": {
                "id": "gate_d",
                "name": "Gate D (South Entrance)",
                "type": "gate",
                "status": "Open",
                "base_congestion": 30.0,
                "congestion": 30.0,
                "queue_time": 5,
                "staff_count": 15,
                "description": "Southern entrance, typically low congestion."
            },
            "Section 102 (F&B)": {
                "id": "section_102",
                "name": "Section 102 F&B Plaza",
                "type": "food",
                "status": "Open",
                "base_congestion": 75.0,
                "congestion": 75.0,
                "queue_time": 15,
                "staff_count": 6,
                "description": "Main food court serving local tacos and beverages."
            },
            "Section 204 (F&B)": {
                "id": "section_204",
                "name": "Section 204 Express Bar",
                "type": "food",
                "status": "Open",
                "base_congestion": 50.0,
                "congestion": 50.0,
                "queue_time": 8,
                "staff_count": 8,
                "description": "Express beverage counter with automated self-checkout."
            },
            "Metro Stadium East": {
                "id": "metro_east",
                "name": "Metro Station (Stadium East)",
                "type": "metro",
                "status": "Crowded",
                "base_congestion": 85.0,
                "congestion": 85.0,
                "queue_time": 32,
                "staff_count": 7,
                "description": "Primary mass transit connection pointing to the city center."
            },
            "Metro Stadium West": {
                "id": "metro_west",
                "name": "Metro Station (Stadium West)",
                "type": "metro",
                "status": "Normal",
                "base_congestion": 35.0,
                "congestion": 35.0,
                "queue_time": 6,
                "staff_count": 12,
                "description": "Secondary rail link with lower frequency trains."
            }
        }
        
        # New Simulated Systems for expanded GenAI features
        self.lifts = {
            "Elevator 1 (Gate A)": "Nominal",
            "Elevator 2 (Gate C)": "Nominal",
            "Elevator 3 (Section 102)": "Offline",
            "Elevator 4 (Section 204)": "Nominal"
        }
        
        self.smart_bins = {
            "Bin Gate A": 42.5,
            "Bin Gate B": 88.0,
            "Bin Gate C": 95.0,
            "Bin Gate D": 31.2,
            "Bin Section 102": 74.0,
            "Bin Section 204": 52.8
        }
        
        self.transit_lines = {
            "Metro East Line": {
                "status": "Crowded",
                "interval": 4, # minutes
                "delay": 0,    # minutes
                "load": 92.0   # % capacity
            },
            "Metro West Line": {
                "status": "Normal",
                "interval": 6,
                "delay": 2,
                "load": 55.0
            },
            "Shuttle Bus Loop A": {
                "status": "Normal",
                "interval": 8,
                "delay": 0,
                "load": 40.0
            },
            "Shuttle Bus Loop B": {
                "status": "Delayed",
                "interval": 12,
                "delay": 9,
                "load": 85.0
            }
        }
        
        # World Cup Matches Schedule (Past, Live, Upcoming)
        self.matches = [
            {
                "id": "match_1",
                "group": "Group A",
                "date": "Yesterday",
                "team1": "Brazil",
                "team1_flag": "br",
                "team2": "Croatia",
                "team2_flag": "hr",
                "score1": 3,
                "score2": 1,
                "status": "Finished",
                "minute": 90,
                "venue": "Estadio Azteca",
                "tactical_note": "Canary yellow squad dominated second-half possessions. Standard high line routing."
            },
            {
                "id": "match_2",
                "group": "Group B",
                "date": "Yesterday",
                "team1": "Germany",
                "team1_flag": "de",
                "team2": "Spain",
                "team2_flag": "es",
                "score1": 2,
                "score2": 2,
                "status": "Finished",
                "minute": 90,
                "venue": "MetLife Stadium",
                "tactical_note": "High-press midfield struggle. Both teams held back during transit exit surges."
            },
            {
                "id": "match_3",
                "group": "Group C",
                "date": "TODAY",
                "team1": "Mexico",
                "team1_flag": "mx",
                "team2": "Canada",
                "team2_flag": "ca",
                "score1": 2,
                "score2": 1,
                "status": "Live",
                "minute": 76,
                "venue": "Feel FIFA Arena",
                "tactical_note": "Mexico maintaining high block. Long ticketing queues reported at Gate C VIP lounge."
            },
            {
                "id": "match_4",
                "group": "Group D",
                "date": "Tomorrow, 18:00",
                "team1": "USA",
                "team1_flag": "us",
                "team2": "Argentina",
                "team2_flag": "ar",
                "score1": 0,
                "score2": 0,
                "status": "Upcoming",
                "minute": 0,
                "venue": "SoFi Stadium",
                "tactical_note": "Match preparation underway. High egress loading predicted for transit West line."
            },
            {
                "id": "match_5",
                "group": "Group E",
                "date": "July 10, 20:30",
                "team1": "France",
                "team1_flag": "fr",
                "team2": "Japan",
                "team2_flag": "jp",
                "score1": 0,
                "score2": 0,
                "status": "Upcoming",
                "minute": 0,
                "venue": "Hard Rock Stadium",
                "tactical_note": "Roster configurations optimized. Digital signs generated for high-density entry."
            }
        ]
        
        # Active incidents list
        self.incidents = [
            {
                "id": "inc_001",
                "zone": "Gate C",
                "severity": "High",
                "description": "RFID Turnstile Reader 3 & 4 Offline due to local network switch failure.",
                "time_raised": "15 mins ago"
            },
            {
                "id": "inc_002",
                "zone": "Metro Stadium East",
                "severity": "Medium",
                "description": "Platform overcrowding forcing intermittent gate closures to manage passenger safety.",
                "time_raised": "8 mins ago"
            }
        ]
        
        self.system_logs = [
            "[SYSTEM] Feel FIFA Nexus Engine Initialized.",
            "[SYSTEM] Live Telemetry Sim starting...",
            "[ALERT] Gate C turnstile connection failure detected.",
            "[ALERT] Metro Stadium East platform reaching critical density limits."
        ]

    def get_state(self) -> Dict[str, Any]:
        # Update state dynamically based on time to simulate real-time movement
        elapsed = time.time() - self.start_time
        
        # 1. Update Attendance
        self.attendance = min(78500, int(68450 + (elapsed * 2.5) % 11000))
        
        # 2. Dynamic Congestion Fluctuations
        for name, zone in self.zones.items():
            wave = 8 * math.sin(elapsed / 30.0 + (hash(name) % 10))
            noise = random.uniform(-2.5, 2.5)
            
            # Incident impact
            incident_impact = 0.0
            for inc in self.incidents:
                if inc["zone"] in name or name in inc["zone"]:
                    if inc["severity"] == "High":
                        incident_impact += 25.0
                    elif inc["severity"] == "Medium":
                        incident_impact += 15.0
                    else:
                        incident_impact += 5.0
            
            staff_effect = (10 - zone["staff_count"]) * 2.5
            
            raw_congestion = zone["base_congestion"] + wave + noise + incident_impact + staff_effect
            zone["congestion"] = round(max(5.0, min(99.0, raw_congestion)), 1)
            
            # Queue times
            factor = 0.028
            calculated_queue = (zone["congestion"] ** 1.8) / (zone["staff_count"] + 1) * factor
            zone["queue_time"] = max(1, int(calculated_queue))
            
            # Update status word
            if zone["congestion"] > 80:
                zone["status"] = "Critical" if zone["type"] == "gate" or zone["type"] == "metro" else "Saturated"
            elif zone["congestion"] > 60:
                zone["status"] = "Heavy" if zone["type"] == "gate" or zone["type"] == "metro" else "Busy"
            elif zone["congestion"] > 35:
                zone["status"] = "Normal" if zone["type"] == "gate" or zone["type"] == "metro" else "Moderate"
            else:
                zone["status"] = "Clear"
                
        # 3. Fluctuate Smart Bins fill levels (slowly filling up, capped at 99%)
        for bin_name in self.smart_bins.keys():
            self.smart_bins[bin_name] = round(min(99.9, self.smart_bins[bin_name] + random.uniform(0.02, 0.15)), 1)
            
        # 4. Fluctuate Transit services
        for line_name, line in self.transit_lines.items():
            noise = random.uniform(-3.0, 3.0)
            line["load"] = round(max(20.0, min(99.0, line["load"] + noise)), 1)
            # Update transit status labels
            if line["load"] > 85:
                line["status"] = "Crowded"
            elif line["load"] > 65:
                line["status"] = "Busy"
            else:
                line["status"] = "Normal"
                
            # Randomly fluctuate delays slightly (delay goes up/down)
            if random.random() < 0.05:
                line["delay"] = max(0, line["delay"] + random.choice([-1, 1]))
                
        # 5. Fluctuate Live Match Score / Minute
        live_match = self.matches[2]
        live_match["minute"] = min(90, int(76 + (elapsed / 8) % 15))
        # Randomly score goal in the match
        if live_match["minute"] > 85 and live_match["score1"] == 2 and random.random() < 0.02:
            live_match["score1"] = 3
            self.add_log("[GOAL] Mexico scores! Mexico 3 - 1 Canada. Crowd roar recorded at 108dB.")
        
        # Periodically generate random logs or status reports (5% chance per call)
        if random.random() < 0.1 and elapsed > 5:
            log_templates = [
                "[TELEM] Gate B ticketing sensor indicates {scanning_rate} scans/min.",
                "[GREEN] Smart trash bin {bin_name} fill index exceeds {bin_val}%. Dispatch flagged.",
                "[TRANSIT] Metro West Loop experiencing {delay}m queue platform delay.",
                "[SYSTEM] Accessibility elevator operational diagnostic complete. Lifts synced.",
                "[STAFF] Maintenance unit dispatched to clear debris at Section 102."
            ]
            template = random.choice(log_templates)
            log_msg = template.format(
                scanning_rate=random.randint(18, 32),
                bin_name=random.choice(list(self.smart_bins.keys())),
                bin_val=random.randint(75, 95),
                delay=random.randint(2, 6)
            )
            self.add_log(log_msg)

        # Trigger random incident if none exist, or periodically (2% chance)
        if len(self.incidents) < 4 and random.random() < 0.02:
            potential_incidents = [
                ("Section 102 (F&B)", "Low", "Beverage dispenser leak in lane 2. Maintenance notified."),
                ("Gate B", "Medium", "Minor ticketing system lag affecting turnaround rates."),
                ("Section 204 (F&B)", "Medium", "Sudden surge in order volume causing payment terminal timeout."),
                ("Metro Stadium West", "Low", "Slight delay reported on inbound shuttle train.")
            ]
            active_zones = {inc["zone"] for inc in self.incidents}
            choices = [c for c in potential_incidents if c[0] not in active_zones]
            if choices:
                chosen = random.choice(choices)
                self.add_incident(chosen[0], chosen[1], chosen[2])

        return {
            "attendance": self.attendance,
            "capacity": self.total_capacity,
            "zones": self.zones,
            "lifts": self.lifts,
            "smart_bins": self.smart_bins,
            "transit_lines": self.transit_lines,
            "matches": self.matches,
            "incidents": self.incidents,
            "logs": self.system_logs[-20:],
            "timestamp": time.time()
        }

    def shift_staff(self, from_zone: str, to_zone: str, count: int) -> bool:
        if from_zone not in self.zones or to_zone not in self.zones:
            return False
        
        count = int(count)
        if self.zones[from_zone]["staff_count"] >= count:
            self.zones[from_zone]["staff_count"] -= count
            self.zones[to_zone]["staff_count"] += count
            self.add_log(f"[STAFF] Re-allocated {count} staff from {from_zone} to {to_zone}.")
            return True
        return False

    def add_incident(self, zone: str, severity: str, description: str):
        inc_id = f"inc_{random.randint(100, 999)}"
        incident = {
            "id": inc_id,
            "zone": zone,
            "severity": severity,
            "description": description,
            "time_raised": "Just now"
        }
        self.incidents.append(incident)
        self.add_log(f"[ALERT] NEW INCIDENT: {description} in {zone} ({severity} priority)")
        return incident

    def resolve_incident(self, inc_id: str) -> bool:
        for inc in self.incidents:
            if inc["id"] == inc_id:
                self.incidents.remove(inc)
                self.add_log(f"[SYSTEM] Incident {inc_id} in {inc['zone']} marked as RESOLVED.")
                return True
        return False

    def empty_bin(self, bin_name: str) -> bool:
        if bin_name in self.smart_bins:
            self.smart_bins[bin_name] = 0.0
            self.add_log(f"[GREEN] Smart bin '{bin_name}' emptied by Janitorial dispatch.")
            return True
        return False

    def toggle_lift(self, lift_name: str, status: str) -> bool:
        if lift_name in self.lifts:
            self.lifts[lift_name] = status
            self.add_log(f"[SYSTEM] Elevator status override: '{lift_name}' marked as {status.upper()}.")
            return True
        return False

    def add_log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        self.system_logs.append(f"[{timestamp}] {message}")
