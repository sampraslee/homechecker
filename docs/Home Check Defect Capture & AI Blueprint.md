# Home Check Defect Capture & AI Blueprint

## 1\. Purpose

Build a dedicated Home Check application for recording **observable property defects and supporting evidence**.

---
## 2\. Core Data Structure

Every defect follows:

**Property → Unit → Area/Room → Item → Label → Sub-label → Evidence**

Example:

**Master Bedroom → Wardrobe → Hardware & Fittings → Loose Hinge**

One item may have multiple defects:

* Hardware & Fittings → Loose Hinge  
* Alignment & Fit → Door Misaligned  
* Surface & Finish → Scratched

One photo/video may support multiple defects.

One defect may also contain multiple photos/videos/audio files.

---
## 3\. Master Defect Labels

### Surface & Finish

Scratched, Scuffed, Chipped Finish, Paint Peeling, Paint Flaking, Paint Bubbling, Faded, Discolored, Stained, Marked, Uneven Finish, Patchy Finish, Adhesive Residue, Burn Mark, Rust/Corrosion, Tarnished.

### Physical Damage

Dented, Chipped, Broken, Hole/Puncture, Bent, Warped, Torn, Cut, Frayed, Split, Damaged Edge, Damaged Corner, Detached, Partially Detached.

### Crack / Separation / Deformation

Hairline Crack, Open Crack, Joint Separation, Gap, Bulging, Sagging, Swelling, Delamination, Rot/Decay.

### Alignment & Fit

Misaligned, Uneven, Not Level, Not Flush, Rubbing, Sticking, Jammed, Out of Track, Does Not Open Fully, Does Not Close Fully, Does Not Latch, Does Not Seal.

### Hardware & Fittings

Loose/Broken/Missing Hinge, Handle, Knob, Lock, Latch, Screw, Fastener, Bracket, Rail, Runner, Track, Wheel, Stopper, Seal/Gasket, Cap/Cover.

### Function & Operation

Not Working, Partially Working, Intermittent, Difficult to Operate, Weak Performance, Slow Response, Sensor Fault, Control Fault, Timer Fault, Display Fault.

### Water & Moisture

Active Leak, Dripping, Seepage, Watermark, Water Stain, Damp, Wet, Condensation, Pooling, Water Damage, Failed Sealant/Silicone.

### Plumbing & Drainage

No Water, Low Pressure, Weak Flow, Tap Leak, Pipe Leak, Joint Leak, Trap Leak, Hose Leak, Blocked Drain, Slow Drainage, Backflow, Flush Fault, Cistern Leak, Hot Water Unavailable.

### Electrical & Power

No Power, Socket Fault, Switch Fault, Loose/Damaged Socket, Loose/Damaged Switch, Exposed Wire, Damaged Cable, Damaged Plug, Burn Mark, Overheating, Tripping.

### Lighting

Not Working, Flickering, Dim, Intermittent, Bulb Missing/Damaged, Fitting Loose/Damaged, Cover/Diffuser Missing/Damaged.

### Air-conditioning & Ventilation

Not Cooling, Weak Cooling, Uneven Cooling, Weak Airflow, Water Leak, Condensation, Noisy, Vibrating, Bad Odour, Dirty/Missing Filter, Remote Missing/Faulty, Fan Fault, Exhaust Fault.

### Appliance & Equipment

No Power, Not Working, Partially Working, Heating Fault, Cooling Fault, Temperature Fault, Leak, Abnormal Noise, Vibration, Smell, Display Fault, Control Fault, Door/Lid Fault, Seal Fault, Accessory Missing.

### Cleanliness

Dusty, Dirty, Greasy, Stained, Sticky, Food Residue, Construction Residue, Adhesive Residue, Limescale, Soap Scum, Debris.

### Mould / Biological Growth

Mould, Mildew, Fungus, Algae, Organic Growth.

### Pest Evidence

Termite Evidence, Termite Damage, Ants, Cockroach Evidence, Rodent Evidence, Droppings, Nest, Other Insect Evidence.

### Missing / Incomplete

Item Missing, Component Missing, Accessory Missing, Fixture Missing, Fitting Missing, Cover Missing, Key Missing, Remote Missing, Shelf/Drawer Missing, Installation Incomplete, Not Installed.

### Installation / Workmanship

Poor Installation, Uneven Installation, Misaligned Installation, Poor Joint, Poor/Missing Sealant, Poor/Missing Grout, Exposed Gap, Exposed Fastener, Visible Patching, Poor Paint Edge, Incorrect Installation.

### Noise & Vibration

Squeaking, Creaking, Rattling, Humming, Grinding, Knocking, Buzzing, Excessive Noise, Excessive Vibration.

### Odour

Damp Smell, Mould Smell, Drain/Sewage Smell, Smoke Smell, Burnt Smell, Chemical Smell, Pest Odour, Unknown Odour.

### Wear / Deterioration

Worn, Abraded, Perished, Brittle, Faded from Age, Worn Coating, Worn Edge, Aged Sealant, Aged Rubber, General Deterioration.

### Other / Unknown
Other Defect, Unable to Determine.

**Rule:** AI cannot invent new labels. Unknown conditions must use Other/Unknown and can be reviewed later.

---
## 4\. Evidence Types

Each defect may contain:

* Photo  
* Video with audio  
* Audio recording  
* Text note

**Photos:** suitable for Vision LLM analysis.

**Video/audio:** primarily human evidence in V1. AI processing can be added later.

---

## 5\. Offline-First Operation

The entire inspection must work without the internet.

During inspection:

**Capture → Process locally → Save locally → Continue**

Internet is NOT required for:

* Creating inspection  
* Selecting room/item  
* Taking photos  
* Recording video/audio  
* Manual labels  
* Notes  
* Saving defects

App displays:

**Saved on Device**  
**Waiting to Sync: XX files**  
**Waiting for AI: XX photos**

When connection returns, syncing happens automatically.

---

## 6\. Application Format

Preferred architecture:

**Inspector:** Android APK  
**Office/Admin:** Web application  
**Backend:** Shared cloud system

APK can be built using web technology such as React/Vue \+ Capacitor.

Reason for APK:

* Better camera access  
* Better local file management  
* Reliable offline operation  
* Background upload/sync  
* On-device image/video processing

---

## 7\. On-Device Image Processing

Photos are processed on the phone before upload.

For every captured image:

**Original**  
→ retained locally

**Evidence/AI Copy**  
→ resize to approximately 1920–2048px longest edge  
→ JPEG approximately 80–85% quality

**Thumbnail**  
→ small version for fast app viewing

Typical structure:

`Original → Evidence Copy → Thumbnail`

The smaller Evidence Copy uploads first.

Full-resolution originals may upload later, preferably on Wi-Fi.

Important defects can be marked:

**Keep Original / HD Evidence**

Original evidence must never be overwritten by the compressed copy.

---

## 8\. On-Device Video Processing

Videos should also be processed locally.

Flow:

**Original Video**  
→ preserve locally  
→ create compressed Evidence Video  
→ create thumbnail  
→ queue for upload

Recommended:

* Short videos, normally 10–30 seconds  
* Approximately 1080p  
* Preserve audio  
* Upload compressed copy first  
* Original may upload later on Wi-Fi

Videos are mainly supporting evidence rather than automatically AI-analysed in V1.

---

## 9\. Local Storage

Use local database/storage such as:

**SQLite**

* Inspection records  
* Defects  
* Labels  
* Media IDs  
* Sync status  
* AI status

**Private device filesystem**

* Photos  
* Videos  
* Audio

Every file receives a durable UUID.

Example:

`media_uuid → inspection_uuid → defect_uuid → local_file → cloud_file → sync_status`

---

## 10\. Cloud Storage

Actual photos/videos/audio should NOT be stored inside normal database tables.

Use:

**Database**  
→ metadata, UUIDs, relationships, labels, timestamps, file locations

**Object Storage**  
→ photos, videos and audio

Uploads must support:

* Queueing  
* Retry after failure  
* Interrupted connection recovery  
* Mobile-data vs Wi-Fi rules  
* Confirmation before local originals are removed

---

## 11\. Vision AI Workflow

After an image is uploaded:

**Photo \+ Known Room \+ Known Item**  
→ Vision LLM  
→ classify against approved taxonomy  
→ return one or more Label/Sub-label suggestions  
→ human reviews  
→ human confirms/corrects  
→ final Home Check data

Example:

AI detects:

* Water & Moisture → Watermark  
* Surface & Finish → Paint Peeling  
* Mould → Mould (uncertain)

The AI result and human-confirmed result must be stored separately.

**AI must never overwrite human-confirmed data.**

---

## 12\. AI Confidence

Do not depend only on an AI-generated percentage.

System confidence should consider:

* Image quality  
* Visibility of defect  
* Competing classifications  
* Model consistency  
* Known room/item context  
* Historical human corrections

Display simply:

**High / Medium / Low**

Low-confidence results require human review.

---
## 14\. Final Principle

Home Check should remain a **factual defect and evidence capture system**.

Its primary job is:

**Capture → Standardize → Preserve Evidence → AI Assist → Human Confirm → Store**

Other systems may later consume the Home Check data for:

* Recommendations  
* Repairs  
* Maintenance  
* Risk assessments  
* Costing  
* Comparisons  
* Tenancy management

But those functions should remain separate from the Home Check itself.

# **Master Home Check Defect Label Dictionary V1**

## **Purpose**

This dictionary is the controlled vocabulary for:

* Home Check app  
* Manual defect entry  
* Vision LLM classification  
* Reports  
* Future analytics  
* Future comparison between inspections

The AI and inspectors should use these standardized labels instead of free-form defect names.

Structure:

**Item → Label → Sub-label**

One item may have multiple Label \+ Sub-label combinations.

Example:

**Wardrobe**

* Hardware & Fittings → Loose Hinge  
* Alignment & Fit → Door Misaligned  
* Surface & Finish → Scratched

---

# **1\. Surface & Finish — `SF`**

| Code | Sub-label |
| ----- | ----- |
| SF-SCRATCH | Scratched |
| SF-SCUFF | Scuffed |
| SF-CHIP | Chipped Finish |
| SF-PEEL | Paint Peeling |
| SF-FLAKE | Paint Flaking |
| SF-BUBBLE | Paint Bubbling |
| SF-FADE | Faded |
| SF-DISCOLOR | Discoloured |
| SF-STAIN | Stained |
| SF-MARK | Marked |
| SF-UNEVEN | Uneven Finish |
| SF-PATCHY | Patchy Finish |
| SF-TOUCHUP | Visible Touch-up |
| SF-RESIDUE | Adhesive Residue |
| SF-BURN | Burn / Scorch Mark |
| SF-RUST | Rust / Corrosion |
| SF-TARNISH | Tarnished |
| SF-SURFACE-DMG | General Surface Damage |

---

# **2\. Physical Damage — `PD`**

| Code | Sub-label |
| ----- | ----- |
| PD-DENT | Dented |
| PD-CHIP | Chipped |
| PD-BROKEN | Broken |
| PD-HOLE | Hole / Puncture |
| PD-BENT | Bent |
| PD-WARP | Warped |
| PD-TORN | Torn |
| PD-CUT | Cut |
| PD-FRAY | Frayed |
| PD-SPLIT | Split |
| PD-EDGE | Damaged Edge |
| PD-CORNER | Damaged Corner |
| PD-DETACHED | Detached |
| PD-PARTDET | Partially Detached |
| PD-CRUSH | Crushed |
| PD-IMPACT | Impact Damage |

---

# **3\. Crack / Separation / Deformation — `CD`**

| Code | Sub-label |
| ----- | ----- |
| CD-HAIRLINE | Hairline Crack |
| CD-OPENCRACK | Open Crack |
| CD-DEEPCRACK | Deep Crack |
| CD-JOINTSEP | Joint Separation |
| CD-GAP | Gap |
| CD-BULGE | Bulging |
| CD-SAG | Sagging |
| CD-SWELL | Swelling |
| CD-DELAM | Delamination |
| CD-ROT | Rot / Decay |
| CD-HOLLOW | Hollow Area |
| CD-DISTORT | Distortion / Deformation |

---

# **4\. Alignment & Fit — `AF`**

| Code | Sub-label |
| ----- | ----- |
| AF-MISALIGN | Misaligned |
| AF-UNEVEN | Uneven |
| AF-NOTLEVEL | Not Level |
| AF-NOTFLUSH | Not Flush |
| AF-GAP | Excessive Gap |
| AF-RUB | Rubbing |
| AF-STICK | Sticking |
| AF-JAM | Jammed |
| AF-OFFTRACK | Out of Track |
| AF-OPEN | Does Not Open Fully |
| AF-CLOSE | Does Not Close Fully |
| AF-LATCH | Does Not Latch |
| AF-SEAL | Does Not Seal Properly |
| AF-LOOSEFIT | Loose Fit |

---

# **5\. Hardware & Fittings — `HF`**

| Code | Sub-label |
| ----- | ----- |
| HF-HINGE-LOOSE | Loose Hinge |
| HF-HINGE-BROKEN | Broken Hinge |
| HF-HINGE-MISSING | Missing Hinge |
| HF-HANDLE-LOOSE | Loose Handle |
| HF-HANDLE-BROKEN | Broken Handle |
| HF-HANDLE-MISSING | Missing Handle |
| HF-KNOB-LOOSE | Loose Knob |
| HF-KNOB-BROKEN | Broken Knob |
| HF-KNOB-MISSING | Missing Knob |
| HF-LOCK-FAULT | Faulty Lock |
| HF-LOCK-MISSING | Missing Lock |
| HF-LATCH-FAULT | Faulty Latch |
| HF-SCREW-LOOSE | Loose Screw / Fastener |
| HF-SCREW-MISSING | Missing Screw / Fastener |
| HF-BRACKET-LOOSE | Loose Bracket |
| HF-BRACKET-BROKEN | Broken Bracket |
| HF-RAIL-FAULT | Faulty Rail |
| HF-RUNNER-FAULT | Faulty Runner |
| HF-TRACK-FAULT | Faulty Track |
| HF-WHEEL-FAULT | Faulty Wheel / Caster |
| HF-STOPPER-MISSING | Missing Stopper |
| HF-SEAL-DMG | Damaged Seal / Gasket |
| HF-SEAL-MISSING | Missing Seal / Gasket |
| HF-COVER-MISSING | Missing Cap / Cover |

---

# **6\. Function & Operation — `FO`**

| Code | Sub-label |
| ----- | ----- |
| FO-NOTWORK | Not Working |
| FO-PARTIAL | Partially Working |
| FO-INTERMIT | Intermittent |
| FO-DIFFICULT | Difficult to Operate |
| FO-STUCK | Stuck |
| FO-WEAK | Weak Performance |
| FO-SLOW | Slow Response |
| FO-SENSOR | Sensor Fault |
| FO-CONTROL | Control Fault |
| FO-TIMER | Timer Fault |
| FO-DISPLAY | Display Fault |
| FO-REMOTE | Remote Function Fault |
| FO-AUTO | Automatic Function Fault |
| FO-ABNORMAL | Abnormal Operation |

---

# **7\. Water & Moisture — `WM`**

| Code | Sub-label |
| ----- | ----- |
| WM-LEAK | Active Leak |
| WM-DRIP | Dripping |
| WM-SEEP | Seepage |
| WM-WATERMARK | Watermark |
| WM-WATERSTAIN | Water Stain |
| WM-DAMP | Damp |
| WM-WET | Wet Surface |
| WM-CONDENSE | Condensation |
| WM-POOL | Water Pooling |
| WM-WATERDMG | Water Damage |
| WM-SWELL | Moisture Swelling |
| WM-WARP | Moisture Warping |
| WM-SEALFAIL | Failed Sealant / Silicone |
| WM-WATERPROOF | Suspected Waterproofing Failure |

---

# **8\. Plumbing & Drainage — `PL`**

| Code | Sub-label |
| ----- | ----- |
| PL-NOWATER | No Water |
| PL-LOWPRESS | Low Water Pressure |
| PL-WEAKFLOW | Weak Flow |
| PL-IRREGFLOW | Irregular Flow |
| PL-TAPDRIP | Tap Dripping |
| PL-TAPLEAK | Tap Leaking |
| PL-PIPELEAK | Pipe Leak |
| PL-JOINTLEAK | Joint Leak |
| PL-TRAPLEAK | Trap Leak |
| PL-HOSELEAK | Flexible Hose Leak |
| PL-BLOCK | Blocked Drain |
| PL-SLOWDRAIN | Slow Drainage |
| PL-BACKFLOW | Drain Backflow |
| PL-FLUSHFAIL | Flush Not Working |
| PL-WEAKFLUSH | Weak Flush |
| PL-CONFLUSH | Continuous Flushing |
| PL-CISTERN | Cistern Leak |
| PL-FIXTURELOOSE | Sanitary Fixture Loose |
| PL-NOHOTWATER | Hot Water Not Available |
| PL-DRAINODOUR | Drain Odour |

---

# **9\. Electrical & Power — `EL`**

| Code | Sub-label |
| ----- | ----- |
| EL-NOPOWER | No Power |
| EL-INTERMIT | Intermittent Power |
| EL-SOCKETFAIL | Socket Not Working |
| EL-SOCKETLOOSE | Socket Loose |
| EL-SOCKETDMG | Socket Damaged |
| EL-SWITCHFAIL | Switch Not Working |
| EL-SWITCHLOOSE | Switch Loose |
| EL-SWITCHDMG | Switch Damaged |
| EL-COVERMISS | Electrical Cover Missing |
| EL-WIREEXPOSE | Exposed Wire |
| EL-WIRELOOSE | Loose Wire |
| EL-CABLEDMG | Damaged Cable |
| EL-PLUGDMG | Damaged Plug |
| EL-BURN | Burn Mark |
| EL-OVERHEAT | Overheating |
| EL-TRIP | Electrical Tripping |
| EL-UNSAFEWIRE | Unsafe Wiring |
| EL-FITTINGLOOSE | Electrical Fitting Loose |

---

# **10\. Lighting — `LT`**

| Code            | Sub-label                  |
| --------------- | -------------------------- |
| LT-NOTWORK      | Light Not Working          |
| LT-FLICKER      | Flickering                 |
| LT-DIM          | Dim                        |
| LT-INTERMIT     | Intermittent               |
| LT-BULBMISS     | Bulb Missing               |
| LT-BULBDMG      | Bulb Damaged               |
| LT-FITTINGLOOSE | Light Fitting Loose        |
| LT-FITTINGDMG   | Light Fitting Damaged      |
| LT-COVERMISS    | Cover / Diffuser Missing   |
| LT-COVERDMG     | Cover / Diffuser Damaged   |
| LT-DRIVER       | Driver / Transformer Fault |
| LT-SWITCH       | Lighting Switch Fault      |

---

# **11\. Air-conditioning & Ventilation — `AC`**

| Code | Sub-label |
| ----- | ----- |
| AC-NOTCOOL | Not Cooling |
| AC-WEAKCOOL | Weak Cooling |
| AC-UNEVENCOOL | Uneven Cooling |
| AC-WEAKAIR | Weak Airflow |
| AC-LEAK | Water Leaking |
| AC-CONDENSE | Excessive Condensation |
| AC-NOISE | Abnormal Noise |
| AC-VIBRATE | Excessive Vibration |
| AC-ODOUR | Bad Odour |
| AC-FILTERDIRTY | Filter Dirty |
| AC-FILTERMISS | Filter Missing |
| AC-REMOTEMISS | Remote Missing |
| AC-REMOTEFAIL | Remote Not Working |
| AC-DISPLAY | Display Fault |
| AC-FANFAIL | Fan Not Working |
| AC-EXHAUSTFAIL | Exhaust / Ventilation Fan Not Working |
| AC-WEAKEXHAUST | Weak Exhaust |
| AC-VENTDIRTY | Vent Dirty |

---

# **12\. Appliance & Equipment — `AP`**

| Code | Sub-label |
| ----- | ----- |
| AP-NOPOWER | Does Not Power On |
| AP-NOTWORK | Not Working |
| AP-PARTIAL | Partially Working |
| AP-INTERMIT | Intermittent |
| AP-HEATFAIL | Heating Fault |
| AP-COOLFAIL | Cooling Fault |
| AP-TEMPFAULT | Temperature Fault |
| AP-LEAK | Water Leak |
| AP-NOISE | Abnormal Noise |
| AP-VIBRATE | Excessive Vibration |
| AP-ODOUR | Abnormal Smell |
| AP-DISPLAY | Display Fault |
| AP-CONTROL | Control / Button Fault |
| AP-DOOR | Door / Lid Fault |
| AP-SEAL | Seal / Gasket Damaged |
| AP-CABLE | Cable Damaged |
| AP-PLUG | Plug Damaged |
| AP-ACCESSMISS | Accessory Missing |
| AP-COMPMISS | Component Missing |

---

# **13\. Cleanliness & Hygiene — `CL`**

| Code | Sub-label |
| ----- | ----- |
| CL-DUST | Dusty |
| CL-DIRTY | Dirty |
| CL-GREASE | Greasy |
| CL-STAIN | Stained |
| CL-STICKY | Sticky |
| CL-FOOD | Food Residue |
| CL-CONSTRUCT | Construction Residue |
| CL-ADHESIVE | Adhesive Residue |
| CL-LIMESCALE | Limescale |
| CL-SOAP | Soap Scum |
| CL-DEBRIS | Debris |
| CL-HAIR | Hair / Dirt Accumulation |
| CL-DRAIN | Drain Dirty |
| CL-INTERIOR | Interior Dirty |
| CL-EXTERIOR | Exterior Dirty |
| CL-CLEANREQ | Requires Cleaning |

---

# **14\. Mould & Biological Growth — `MB`**

| Code | Sub-label |
| ----- | ----- |
| MB-MOULD | Mould |
| MB-MILDEW | Mildew |
| MB-FUNGUS | Fungus |
| MB-ALGAE | Algae |
| MB-ORGANIC | Organic Growth |
| MB-STAIN | Mould Staining |
| MB-DAMP | Damp-Related Growth |

---

# **15\. Pest Evidence — `PE`**

| Code | Sub-label |
| ----- | ----- |
| PE-TERMITE | Termite Evidence |
| PE-TERMITEDMG | Termite Damage |
| PE-ANT | Ant Evidence |
| PE-ROACH | Cockroach Evidence |
| PE-RODENT | Rodent Evidence |
| PE-INSECT | Other Insect Evidence |
| PE-DROPPING | Pest Droppings |
| PE-NEST | Pest Nest |
| PE-SPIDER | Spider / Cobweb Evidence |
| PE-UNKNOWN | Unknown Pest Evidence |

---

# **16\. Missing / Incomplete — `MI`**

| Code | Sub-label |
| ----- | ----- |
| MI-ITEM | Item Missing |
| MI-COMPONENT | Component Missing |
| MI-ACCESSORY | Accessory Missing |
| MI-FIXTURE | Fixture Missing |
| MI-FITTING | Fitting Missing |
| MI-COVER | Cover Missing |
| MI-CAP | Cap Missing |
| MI-SHELF | Shelf Missing |
| MI-DRAWER | Drawer Missing |
| MI-KEY | Key Missing |
| MI-REMOTE | Remote Missing |
| MI-BULB | Bulb Missing |
| MI-SEAL | Seal / Gasket Missing |
| MI-FASTENER | Screw / Fastener Missing |
| MI-INCOMPLETE | Installation Incomplete |
| MI-NOTINSTALLED | Not Installed |

---

# **17\. Installation & Workmanship — `IW`**

| Code | Sub-label |
| ----- | ----- |
| IW-POORINSTALL | Poor Installation |
| IW-POORFINISH | Poor Finishing |
| IW-UNEVEN | Uneven Installation |
| IW-MISALIGN | Misaligned Installation |
| IW-JOINT | Poor Joint |
| IW-SEALANT | Poor Sealant |
| IW-SEALANTMISS | Missing / Incomplete Sealant |
| IW-GROUT | Poor Grouting |
| IW-GROUTMISS | Missing Grout |
| IW-GROUTUNEVEN | Uneven Grout |
| IW-FASTENER | Exposed Fastener |
| IW-GAP | Exposed Gap |
| IW-PATCH | Visible Patching |
| IW-PAINTEDGE | Poor Paint Edge |
| IW-TEMP | Temporary Repair |
| IW-INCORRECT | Incorrect Installation |
| IW-POSITION | Incorrect Positioning |

---

# **18\. Noise & Vibration — `NV`**

| Code | Sub-label |
| ----- | ----- |
| NV-SQUEAK | Squeaking |
| NV-CREAK | Creaking |
| NV-RATTLE | Rattling |
| NV-HUM | Humming |
| NV-GRIND | Grinding |
| NV-KNOCK | Knocking |
| NV-BUZZ | Buzzing |
| NV-NOISE | Excessive Operating Noise |
| NV-VIBRATE | Excessive Vibration |
| NV-UNKNOWN | Unknown Abnormal Noise |

---

# **19\. Odour — `OD`**

| Code | Sub-label |
| ----- | ----- |
| OD-DAMP | Damp Smell |
| OD-MOULD | Mould Smell |
| OD-DRAIN | Drain / Sewage Smell |
| OD-SMOKE | Smoke Smell |
| OD-BURNT | Burnt Smell |
| OD-CHEMICAL | Chemical Smell |
| OD-FOOD | Food Smell |
| OD-PEST | Pest Odour |
| OD-UNKNOWN | Unknown Abnormal Odour |

---

# **20\. Wear & Deterioration — `WD`**

| Code | Sub-label |
| ----- | ----- |
| WD-WORN | Worn |
| WD-HEAVYWORN | Heavily Worn |
| WD-ABRADED | Abraded |
| WD-PERISHED | Perished |
| WD-BRITTLE | Brittle |
| WD-FADED | Faded from Age |
| WD-COATING | Worn Coating |
| WD-EDGE | Worn Edge |
| WD-SURFACE | Worn Surface |
| WD-SEALANT | Aged Sealant |
| WD-RUBBER | Aged Rubber |
| WD-LOOSE | Loose Due to Wear |
| WD-GENERAL | General Deterioration |

---

# **21\. Glass / Mirror — `GM`**

| Code | Sub-label |
| ----- | ----- |
| GM-CRACK | Cracked Glass |
| GM-CHIP | Chipped Glass |
| GM-BROKEN | Broken Glass |
| GM-SCRATCH | Scratched Glass |
| GM-FOG | Fogged / Cloudy Glass |
| GM-STAIN | Stained Glass |
| GM-LOOSE | Glass / Mirror Loose |
| GM-SEAL | Glass Seal Failure |
| GM-MIRROR-DAMAGE | Mirror Surface Damage |
| GM-MIRROR-DISCOLOR | Mirror Discolouration |

---

# **22\. Floor / Tile / Stone — `FL`**

| Code | Sub-label |
| ----- | ----- |
| FL-CRACK | Cracked Tile / Flooring |
| FL-CHIP | Chipped Tile / Flooring |
| FL-LOOSE | Loose Tile / Flooring |
| FL-HOLLOW | Hollow Tile |
| FL-LIFT | Flooring Lifted |
| FL-WARP | Flooring Warped |
| FL-GAP | Flooring Gap |
| FL-STAIN | Flooring Stained |
| FL-SCRATCH | Flooring Scratched |
| FL-GROUT | Grout Defect |
| FL-UNEVEN | Uneven Floor |
| FL-DISPLACE | Tile Displaced |

---

# **23\. Door / Window — `DW`**

| Code | Sub-label |
| ----- | ----- |
| DW-STICK | Sticking |
| DW-JAM | Jammed |
| DW-MISALIGN | Misaligned |
| DW-CLOSEFAIL | Cannot Close Properly |
| DW-OPENFAIL | Cannot Open Properly |
| DW-LOCKFAIL | Lock Fault |
| DW-HINGE | Hinge Fault |
| DW-TRACK | Track Fault |
| DW-ROLLER | Roller Fault |
| DW-SEAL | Seal Fault |
| DW-GAP | Excessive Gap |
| DW-FRAME | Frame Damage |
| DW-MESH | Mosquito Mesh Damage |

---

# **24\. Ceiling / Wall Specific — `CW`**

| Code | Sub-label |
| ----- | ----- |
| CW-HAIRLINE | Hairline Crack |
| CW-OPENCRACK | Open Crack |
| CW-PEEL | Paint Peeling |
| CW-BUBBLE | Paint Bubbling |
| CW-WATERMARK | Watermark |
| CW-DAMP | Damp Area |
| CW-MOULD | Mould |
| CW-HOLE | Hole |
| CW-PATCH | Visible Patch |
| CW-UNEVEN | Uneven Surface |
| CW-SAG | Ceiling Sagging |
| CW-DAMAGE | General Wall/Ceiling Damage |

---

# **25\. Cabinet / Furniture Specific — `CF`**

| Code | Sub-label |
| ----- | ----- |
| CF-HINGE | Hinge Fault |
| CF-RUNNER | Drawer Runner Fault |
| CF-HANDLE | Handle Fault |
| CF-DOOR-MISALIGN | Door Misaligned |
| CF-DRAWER-MISALIGN | Drawer Misaligned |
| CF-SHELF | Shelf Damage |
| CF-LAMINATE | Laminate Peeling |
| CF-SWELL | Swollen Board |
| CF-CHIP | Chipped Board |
| CF-SCRATCH | Scratched Surface |
| CF-LOOSE | Loose Structure |
| CF-BROKEN | Broken Component |

---

# **26\. Sanitary Fittings — `SN`**

| Code | Sub-label |
| ----- | ----- |
| SN-TOILET-LOOSE | Toilet Bowl Loose |
| SN-TOILET-CRACK | Toilet Bowl Cracked |
| SN-SEAT-BROKEN | Toilet Seat Broken |
| SN-SEAT-LOOSE | Toilet Seat Loose |
| SN-BASIN-CRACK | Basin Cracked |
| SN-BASIN-LOOSE | Basin Loose |
| SN-TAP-LOOSE | Tap Loose |
| SN-SHOWER-FAULT | Shower Fitting Fault |
| SN-HOSE-FAULT | Shower Hose Fault |
| SN-HOLDER | Holder / Accessory Fault |
| SN-SEAL | Silicone / Seal Failure |
| SN-LEAK | Sanitary Fixture Leak |

---

# **27\. Curtain / Blind — `CB`**

| Code | Sub-label |
| ----- | ----- |
| CB-DIRTY | Dirty |
| CB-STAIN | Stained |
| CB-TORN | Torn |
| CB-HOOKMISS | Hook / Ring Missing |
| CB-RAIL | Rail Fault |
| CB-ROD | Rod Fault |
| CB-CHAIN | Chain Fault |
| CB-MOTOR | Motor Fault |
| CB-STUCK | Stuck |
| CB-MISALIGN | Misaligned |
| CB-FABRIC | Fabric Damage |

---

# **28\. Other / Unknown — `OT`**

| Code | Sub-label |
| ----- | ----- |
| OT-OTHER | Other Defect |
| OT-UNKNOWN | Unable to Determine |
| OT-INSPECT | Further Inspection Required |

---

# **AI Classification Rules**

The Vision LLM should follow these rules:

1. AI must select from this approved dictionary only.  
2. AI may return multiple defect combinations for one image.  
3. AI should use the known Room and Item as context.  
4. AI should prioritize labels mapped to the selected item.  
5. AI should not invent new defect names.  
6. If uncertain, use `Other / Unknown`.  
7. AI output remains a suggestion until confirmed by a human.  
8. AI and final human classifications must both be retained for audit purposes.

Example output:

**Item:** Wardrobe Door

AI Suggestions:

* `HF-HINGE-LOOSE` — Hardware & Fittings → Loose Hinge  
* `AF-MISALIGN` — Alignment & Fit → Misaligned  
* `SF-SCRATCH` — Surface & Finish → Scratched

---

# **Important Design Rule**

The full dictionary exists in the backend, but inspectors should NOT see all labels at once.

The application should use:

**Item → Relevant Labels → Relevant Sub-labels**

Example:

**Wall**

Show first:

* Surface & Finish  
* Crack / Separation  
* Water & Moisture  
* Mould  
* Installation & Workmanship  
* Cleanliness

**Air Conditioner**

Show first:

* Air-conditioning & Ventilation  
* Function & Operation  
* Water & Moisture  
* Noise & Vibration  
* Electrical & Power  
* Cleanliness

**Wardrobe**

Show first:

* Surface & Finish  
* Physical Damage  
* Hardware & Fittings  
* Alignment & Fit  
* Cabinet/Furniture  
* Missing / Incomplete

The master taxonomy remains universal, while the interface stays fast and simple.

