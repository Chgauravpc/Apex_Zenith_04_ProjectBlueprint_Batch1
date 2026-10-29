export const IMAGES = {
    hero: "https://images.unsplash.com/photo-1740209475472-aa7d280f7452?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxjbmMlMjBtYWNoaW5lJTIwbWFjaGluaXN0JTIwZmFjdG9yeSUyMGluZHVzdHJpYWwlMjBwcmVjaXNpb258ZW58MHx8fHwxNzkzMjUyNjI5fDA&ixlib=rb-4.1.0&q=85",
    machinist: "https://images.unsplash.com/photo-1528953030358-b0c7de371f1f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxtYWNoaW5pc3QlMjBlbmdpbmVlciUyMGZhY3RvcnklMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwwfHx8fDE3OTMyNTI2MzV8MA&ixlib=rb-4.1.0&q=85",
    lathe: "https://images.unsplash.com/photo-1666634157070-6fd830fb5672?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxjbmMlMjBtYWNoaW5lJTIwbWFjaGluaXN0JTIwZmFjdG9yeSUyMGluZHVzdHJpYWwlMjBwcmVjaXNpb258ZW58MHx8fHwxNzkzMjUyNjI5fDA&ixlib=rb-4.1.0&q=85",
    sparks: "https://images.unsplash.com/photo-1711418235334-8895331a6cf9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwzfHxjbmMlMjBtYWNoaW5lJTIwbWFjaGluaXN0JTIwZmFjdG9yeSUyMGluZHVzdHJpYWwlMjBwcmVjaXNpb258ZW58MHx8fHwxNzkzMjUyNjI5fDA&ixlib=rb-4.1.0&q=85",
    logbook: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxsb2dib29rJTIwYmx1ZXByaW50JTIwbWFudWZhY3R1cmluZyUyMG5vdGVzfGVufDB8fHx8MTc5MzI1MjYzNXww&ixlib=rb-4.1.0&q=85",
    ramesh: "https://images.unsplash.com/photo-1565954786194-d22abeaac3ae?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxtYWNoaW5pc3QlMjBlbmdpbmVlciUyMGZhY3RvcnklMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwwfHx8fDE3OTMyNTI2MzV8MA&ixlib=rb-4.1.0&q=85",
    priya: "https://images.unsplash.com/photo-1661263989552-d82526d03b0f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwzfHxtYWNoaW5pc3QlMjBlbmdpbmVlciUyMGZhY3RvcnklMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwwfHx8fDE3OTMyNTI2MzV8MA&ixlib=rb-4.1.0&q=85",
};

export const PERSONAS = {
    ramesh: {
        id: "ramesh",
        name: "Ramesh Sharma",
        short: "Ramesh",
        initials: "RS",
        role: "Senior Machinist · 28 yrs",
        badge: "Veteran Master",
        detail: "Retires in 14 days",
        avatar: IMAGES.ramesh,
    },
    priya: {
        id: "priya",
        name: "Priya Nair",
        short: "Priya",
        initials: "PN",
        role: "Junior CNC Operator · 3 mo",
        badge: "Apprentice · L1",
        detail: "Assigned: Haas VF-2",
        avatar: IMAGES.priya,
    },
    vikram: {
        id: "vikram",
        name: "Vikram Patel",
        short: "Vikram",
        initials: "VP",
        role: "Shift In-Charge",
        badge: "Operations Supervisor",
        detail: "Plant 2 · A-Shift",
        avatar: IMAGES.machinist,
    },
};

export const ROLE_ORDER = ["ramesh", "priya", "vikram"];

export const NAV = [
    { to: "/", label: "Home", testid: "nav-home-link" },
    { to: "/capture", label: "Capture", testid: "nav-capture-link" },
    { to: "/ask", label: "Ask", testid: "nav-ask-link" },
    { to: "/guided-job", label: "Guided Job", testid: "nav-guided-job-link" },
    { to: "/map", label: "3D Map", testid: "nav-3d-map-link" },
    { to: "/handover", label: "Handover", testid: "nav-handover-link" },
    { to: "/review", label: "Review", testid: "nav-review-link" },
    { to: "/dashboard", label: "Dashboard", testid: "nav-dashboard-link" },
];

export const MARQUEE_TIPS = [
    "Tip #148 · Vibration on 316 Stainless resolved by pre-heating the clamp 5°C",
    "Tip #151 · Haas VF-2 spindle sings at 4,270 RPM — drop to 4,050 and it goes quiet",
    "Tip #156 · Bronze chips on EN8 = perfect cut. Blue means back off the feed now",
    "Tip #160 · Never trust the first offset after a tool change on the turret — measure twice",
    "Tip #163 · Coolant line angled 15° off the cut stops re-cutting chips on thin walls",
    "Tip #167 · Tool 4 squeal on Inconel = coated carbide is glazed. Swap, don't push",
];

export const MACHINES = [
    { id: "vmc3", code: "VMC-03", name: "Haas VF-2", type: "VMC", rpmMax: 8100, teeth: 4, risk: "high", cards: 74 },
    { id: "vmc1", code: "VMC-01", name: "DMG MORI NVX", type: "VMC", rpmMax: 12000, teeth: 3, risk: "medium", cards: 41 },
    { id: "cnc2", code: "CNC-02", name: "Ace Micromatic LT", type: "Lathe", rpmMax: 4500, teeth: 3, risk: "high", cards: 58 },
    { id: "cnc5", code: "CNC-05", name: "AMS MCV-450", type: "VMC", rpmMax: 8000, teeth: 4, risk: "low", cards: 41 },
];

export const KNOWHOW_CARDS = [
    {
        id: 104,
        title: "Chatter on thin-wall Aluminium 6061",
        machine: "Haas VF-2",
        component: "Spindle",
        symptom: "High-pitch squeal + visible ripple marks on wall finish",
        action: "3-flute carbide, 4,200 RPM, 0.15 mm stepover, climb mill only",
        why: "Even flute count excites the wall's natural frequency; odd flute spacing breaks the harmonic.",
        author: PERSONAS.ramesh,
        confidence: 96,
        verified: true,
        date: "2019-11-04",
    },
    {
        id: 42,
        title: "Fixture alignment trick for turbine flanges",
        machine: "Haas VF-2",
        component: "Fixture Table",
        symptom: "Bolt-hole pattern drifts 0.04 mm across 200 mm",
        action: "Indicate the bore, not the edge. Snug bolts in cross pattern, final torque 22 N·m",
        why: "The casting edge is never true to the bore — the bore is what the turbine sees.",
        author: PERSONAS.ramesh,
        confidence: 99,
        verified: true,
        date: "2008-06-19",
    },
    {
        id: 121,
        title: "Tool 4 glazing on Inconel 718",
        machine: "Ace Micromatic LT",
        component: "Turret",
        symptom: "Squeal at 1,200 RPM, silver-blue chips turning straw",
        action: "Never exceed 1,050 RPM on coated carbide. If glazed — swap insert, don't push through",
        why: "Inconel work-hardens instantly; a glazed insert rubs instead of cuts and scrap follows.",
        author: PERSONAS.ramesh,
        confidence: 94,
        verified: true,
        date: "2015-03-27",
    },
    {
        id: 148,
        title: "316 Stainless clamp pre-heat",
        machine: "DMG MORI NVX",
        component: "Fixture Table",
        symptom: "Part walks 0.02 mm mid-cycle, finish pass out of tolerance",
        action: "Warm clamp with heat gun ~5°C before final torque; run rough pass immediately",
        why: "Cold clamp + hot part = differential expansion shifts the part mid-cut.",
        author: PERSONAS.ramesh,
        confidence: 91,
        verified: true,
        date: "2022-08-12",
    },
    {
        id: 163,
        title: "Coolant angle on thin ribs",
        machine: "Haas VF-2",
        component: "Coolant Line",
        symptom: "Re-cut chips welding to rib edges",
        action: "Angle the nozzle 15° ahead of the cutter, not directly at it",
        why: "Flooding the cut point traps chips in the flute path; washing ahead clears them before engagement.",
        author: PERSONAS.ramesh,
        confidence: 89,
        verified: true,
        date: "2024-01-30",
    },
];

export const GUARDIAN_WARNING = {
    severity: "high",
    title: "Note Guardian · Parameter conflict detected",
    message:
        "You logged 1,200 RPM for Inconel 718. History shows 3 insert breakages at this speed on the Ace Micromatic LT.",
    evidence: [
        "QC Reject #QR-2211 · insert fracture · 1,200 RPM · Mar 2015",
        "Maintenance Log #M-0877 · spindle overload trip · Feb 2016",
    ],
    fix: KNOWHOW_CARDS[2],
};

export const ASK_SUGGESTIONS = [
    "How does Ramesh avoid chatter on thin-wall aluminum?",
    "What RPM is safe for Inconel on the lathe?",
    "Why do my flange bolt holes drift?",
    "Chip colour keeps going blue — what now?",
];

export const ASK_ANSWER = {
    answer:
        "For thin-wall Aluminium 6061 on the Haas VF-2, run a 3-flute carbide end mill at 4,200 RPM with a 0.15 mm stepover — climb milling only. The wall rings like a bell; the odd flute spacing breaks the harmonic before it builds.",
    steps: [
        "Switch to 3-flute carbide (Tool 7)",
        "Set spindle 4,200 RPM · feed 950 mm/min",
        "Stepover 0.15 mm, climb direction",
        "Listen: a rising squeal means drop 150 RPM, not feed",
    ],
    watchOut: "Do not copy this to 316 Stainless — same trick, different numbers.",
    sources: [KNOWHOW_CARDS[0], KNOWHOW_CARDS[4]],
    experts: [
        { ...PERSONAS.ramesh, match: 98, note: "Logged both source cards · 28 yrs" },
    ],
    confidence: 94,
};

export const CHATTER_RESULT = {
    frequency: 427,
    machine: "Haas VF-2 · 4-flute tool",
    candidates: [
        { k: 1, rpm: 6405, inRange: true, recommended: true },
        { k: 2, rpm: 3203, inRange: true, recommended: false },
        { k: 3, rpm: 2135, inRange: true, recommended: false },
    ],
    formula: "RPM = 60 × fc ÷ (N × k)",
    expertFix: {
        text: "427 Hz on VF-2? That's the 4-flute singing. I drop to 6,400 RPM and lighten the stepover to 0.12 mm — surface comes out like glass.",
        author: PERSONAS.ramesh,
        card: "Ramesh's Log #104",
    },
};

export const CHIP_SAMPLES = [
    {
        id: "blue",
        name: "Blue-purple chip",
        hue: "Hue 232°",
        verdict: "Overheating",
        severity: "danger",
        meaning: "Cutting zone too hot — insert is cooking and work-hardening the material.",
        action: "Reduce RPM ~15% or increase feed slightly to thicken the chip and carry heat away.",
        expert: "Blue chips mean the tool is screaming. I never let it run past straw on steel. — Ramesh, Log #121",
    },
    {
        id: "bronze",
        name: "Bronze-gold chip",
        hue: "Hue 38°",
        verdict: "Perfect cut",
        severity: "success",
        meaning: "Heat is leaving with the chip exactly as it should. Parameters are dialled in.",
        action: "Lock these parameters into the job card. This is the sweet spot.",
        expert: "Bronze is the colour of money. If you see it, don't touch a thing. — Ramesh, Log #156",
    },
    {
        id: "silver",
        name: "Silver-bright chip",
        hue: "Hue 0° (no tint)",
        verdict: "Cutting too slow",
        severity: "warning",
        meaning: "Too little heat — likely rubbing, poor tool life, long stringy chips risk entanglement.",
        action: "Increase feed or RPM within machine limits; check for a worn or wrong-grade insert.",
        expert: "Silver looks safe but it's lying — the edge is rubbing itself dull. — Ramesh, Log #167",
    },
];

export const JOBS = [
    { id: "8824", part: "Titanium Turbine Flange", machine: "Haas VF-2", material: "Ti-6Al-4V", tolerance: "±0.02 mm" },
    { id: "8831", part: "Hydraulic Manifold Block", machine: "DMG MORI NVX", material: "Al 6061-T6", tolerance: "±0.05 mm" },
];

export const PROCEDURE_STEPS = [
    {
        id: 1,
        title: "Fixture Alignment",
        component: "Fixture Table",
        guardian: false,
        detail: {
            low: "Clean the table with stone and solvent. Seat the fixture and indicate the bore — never the edge. Snug bolts finger-tight in a cross pattern, then torque to 22 N·m. Ramesh's trick: tap the fixture corner with a brass mallet while indicating; you can watch the needle walk to zero.",
            mid: "Indicate the bore within 0.01 mm. Cross-pattern torque 22 N·m. Brass-mallet tap to settle.",
            high: "Bore ≤0.01 mm · 22 N·m cross-torque.",
        },
        params: "22 N·m · ≤0.01 mm TIR",
    },
    {
        id: 2,
        title: "Tool Offset Check",
        component: "Tool Carousel",
        guardian: false,
        detail: {
            low: "After every tool change on the carousel, measure the offset twice before trusting it. Touch off Tool 4 (3-flute carbide) on the setter, then verify with a 50 mm gauge block skim cut. Log both values in the offset page.",
            mid: "Double-measure Tool 4 offset. Gauge-block skim to verify.",
            high: "2× offset verify · skim cut.",
        },
        params: "Tool 4 · gauge 50 mm",
    },
    {
        id: 3,
        title: "Coolant Line Angle",
        component: "Coolant Line",
        guardian: true,
        detail: {
            low: "Angle the nozzle 15° ahead of the cutter path, not directly at the tool. Flooding the exact cut point traps chips in the flute path and re-cuts them into your finish. Ramesh bent the loc-line by hand for years — this fixture now holds the angle for you.",
            mid: "Nozzle 15° ahead of cutter. Never flood the cut point.",
            high: "15° lead angle.",
        },
        params: "15° lead · 6 bar",
    },
    {
        id: 4,
        title: "First Pass Visual + Audio Check",
        component: "Spindle",
        guardian: true,
        detail: {
            low: "Run the first pass at 80% feed override. Watch the chip colour — bronze is perfect, blue means stop and back off RPM. Listen: a rising squeal is the wall resonating; drop 150 RPM, never the feed. Ramesh could hear a tool failing 30 seconds before the load meter moved.",
            mid: "80% override first pass. Bronze chips = good. Squeal → −150 RPM.",
            high: "80% OVR · chip = bronze.",
        },
        params: "4,200 RPM · 950 mm/min",
    },
];

export const COMPONENTS_3D = [
    { id: "base", name: "Machine Enclosure", risk: "low", cards: 12, incidents: 1, expert: "Vikram P." },
    { id: "table", name: "Fixture Table", risk: "medium", cards: 31, incidents: 6, expert: "Ramesh S." },
    { id: "column", name: "Column & Slideways", risk: "low", cards: 9, incidents: 2, expert: "Ramesh S." },
    { id: "head", name: "Spindle Head", risk: "medium", cards: 24, incidents: 4, expert: "Ramesh S." },
    { id: "spindle", name: "Spindle", risk: "high", cards: 18, incidents: 11, expert: "Ramesh S." },
    { id: "carousel", name: "Tool Carousel", risk: "medium", cards: 15, incidents: 5, expert: "Ramesh S." },
    { id: "coolant", name: "Coolant Line", risk: "low", cards: 7, incidents: 1, expert: "Ramesh S." },
    { id: "panel", name: "Control Panel", risk: "low", cards: 6, incidents: 0, expert: "Priya N." },
    { id: "conveyor", name: "Chip Conveyor", risk: "high", cards: 3, incidents: 8, expert: "Ramesh S." },
];

export const HANDOVER_TASKS = [
    { id: 1, title: "Spindle warm-up ritual — VMC-03", status: "done", date: "Jul 02" },
    { id: 2, title: "Inconel speed limits — all lathes", status: "done", date: "Jul 05" },
    { id: 3, title: "Fixture tricks: turbine flange family", status: "done", date: "Jul 08" },
    { id: 4, title: "Chip conveyor jam clearing — VMC-03", status: "active", date: "due Jul 12" },
    { id: 5, title: "Turret alignment after crash recovery", status: "active", date: "due Jul 14" },
    { id: 6, title: "The sound library: 12 failure sounds", status: "pending", date: "due Jul 17" },
    { id: 7, title: "ShadowTrace: full flange setup run", status: "pending", date: "due Jul 19" },
];

export const INTERVIEW_QUESTIONS = [
    { id: 1, q: "Ramesh, the chip conveyor on VMC-03 jams roughly twice a month. What do you check first — and what do you never do?", gap: "Chip Conveyor · 0 cards", answered: false },
    { id: 2, q: "When the turret on the Ace lathe loses alignment after a crash, how do you bring it back without a service call?", gap: "Turret · 1 card", answered: false },
    { id: 3, q: "Priya asked: 'Why does the spindle on VF-2 hum differently on cold Monday mornings?' — only you have answered this before.", gap: "Spindle · cold-start gap", answered: true },
];

export const ROUTED_QUESTIONS = [
    { id: 1, from: "Priya Nair", q: "How tight is too tight on the hydraulic chuck for thin sleeves?", age: "2h ago", machine: "Ace Micromatic LT" },
    { id: 2, from: "Priya Nair", q: "The control panel threw alarm 2049 — the manual says check the way-lube. Where exactly?", age: "5h ago", machine: "Haas VF-2" },
];

export const REVIEW_DRAFTS = [
    {
        id: 1,
        title: "Cold-start spindle hum on VF-2",
        machine: "Haas VF-2",
        component: "Spindle",
        confidence: 78,
        source: "Voice note · 01:42 · Hindi",
        excerpt: "Monday morning the grease is thick — run the warm-up cycle twice before the first cut, or the bearing load spikes...",
        tags: ["spindle", "cold-start", "warm-up"],
    },
    {
        id: 2,
        title: "Way-lube alarm 2049 quick clear",
        machine: "Haas VF-2",
        component: "Control Panel",
        confidence: 71,
        source: "Voice note · 00:58 · Marathi",
        excerpt: "Alarm 2049 is almost always the lube tank float stuck, not empty. Tap the tank side once, watch the pressure gauge climb...",
        tags: ["alarm", "lubrication"],
    },
    {
        id: 3,
        title: "Sleeve chucking pressure rule",
        machine: "Ace Micromatic LT",
        component: "Turret",
        confidence: 84,
        source: "Handwritten logbook scan",
        excerpt: "Thin sleeves: 18 bar max, soft jaws bored to size. Anything more and the bore goes bell-mouthed by 0.03...",
        tags: ["chuck", "pressure", "sleeves"],
    },
];

export const RISK_MATRIX = {
    machines: ["Haas VF-2", "DMG NVX", "Ace LT", "AMS MCV"],
    components: ["Spindle", "Fixture", "Turret", "Coolant", "Conveyor"],
    values: [
        [2, 1, 0, 1, 2],
        [1, 2, 1, 0, 0],
        [2, 1, 2, 1, 1],
        [0, 0, 1, 0, 0],
    ],
};

export const CHART_CAPTURES = [
    { week: "W1", cards: 6 }, { week: "W2", cards: 12 }, { week: "W3", cards: 9 },
    { week: "W4", cards: 18 }, { week: "W5", cards: 24 }, { week: "W6", cards: 31 },
    { week: "W7", cards: 28 }, { week: "W8", cards: 42 },
];

export const CHART_INCIDENTS = [
    { month: "Feb", before: 14, after: 14 }, { month: "Mar", before: 13, after: 11 },
    { month: "Apr", before: 15, after: 8 }, { month: "May", before: 12, after: 6 },
    { month: "Jun", before: 14, after: 4 }, { month: "Jul", before: 13, after: 3 },
];

export const TIMELINE = [
    { time: "07:12", event: "Guardian warned on note #2291 — RPM conflict (Inconel)", type: "warning", machine: "Ace LT" },
    { time: "08:40", event: "Priya completed Guided Job #8824 step 2 with zero deviations", type: "success", machine: "Haas VF-2" },
    { time: "09:25", event: "Ramesh recorded voice card #215 — cold-start spindle ritual", type: "capture", machine: "Haas VF-2" },
    { time: "10:02", event: "QC reject QR-2401 logged — bore bell-mouth on sleeve batch", type: "reject", machine: "Ace LT" },
    { time: "11:15", event: "Chatter Doctor used on floor — 427 Hz → 6,405 RPM applied", type: "success", machine: "Haas VF-2" },
    { time: "12:30", event: "Handover task 4 due in 2 days — chip conveyor undocumented", type: "warning", machine: "Haas VF-2" },
];

export const STATS = [
    { value: "28", unit: "yrs", label: "of experience walking out in 14 days" },
    { value: "214", unit: "", label: "know-how cards captured so far" },
    { value: "62", unit: "%", label: "of Ramesh's tacit knowledge digitised" },
    { value: "6", unit: "", label: "machines mapped in 3D" },
];
