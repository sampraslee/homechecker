# Motion and gestures: proposals

Status: ready-for-agent

**Decisions (2026-10-19):** build G1 and A1–A7. Not G2, G3 or G4.

Home Check is used in a fast, repeated loop: Area, Item, photos, Defects, Done, dozens of times per Unit. So motion here should confirm and orient, quickly and quietly. It should never slow down the hundredth photo. Rules for everything below:

- **Short.** 120–250 ms, ease-out going in, ease-in going out. Nothing blocks a tap while it plays.
- **Reduce motion.** When the phone asks to reduce motion, movement becomes an instant change or a short fade.
- **Every gesture has a visible button too.** Gestures are shortcuts, never the only way.
- **No gesture starts at the screen's left edge.** On iPhone, that edge means "back".

## Gestures

### G1. The phone's own back gesture goes back a screen (fixes a current problem)

**Now:** the app keeps its screens in memory, not in the browser history. On Android, the system back button or gesture closes the installed app instead of going back a screen. In Safari, a swipe from the left edge leaves Home Check.

**Proposal:** each screen change goes into the browser history. The back gesture or button then does exactly what the "‹" button in the band does. Opening a panel (Add Item, the Defect picker, the photo viewer) also gets a history entry, so back closes the panel first.

**Why first:** this uses gestures people already know instead of inventing new ones, and it stops Inspections from being closed by accident mid-visit.

### G2. Swipe between photos in the photo viewer

**Proposal:** in the photo viewer, swipe left or right to go to the next or previous photo of the Item. The photo follows the finger, and past about a third of the width it moves on, otherwise it snaps back. Visible ‹ › buttons and "2 of 5" do the same.

**Why:** checking a set of photos one by one now means closing the viewer and opening the next thumbnail.

### G3. Swipe down to close the photo viewer

**Proposal:** drag the photo down. Past about 120 px it closes, otherwise it springs back. The background fades as you drag. The Close button stays.

**Why:** it's the usual way to close a full-screen photo on both iPhone and Android, and it's easier to reach than Close in the top corner.

### G4. Swipe left on an Item row to show Rename and Remove (lowest priority)

**Proposal:** on the Area screen, swipe an Item row left to show its Rename and Remove buttons, as Edit mode does for every row. The Edit button stays.

**Why it's last:** flow D put these actions behind Edit, to stop them being hit by accident. A swipe brings them back to every row, and a sideways swipe while scrolling can open one by mistake. Only worth doing if Edit feels slow in use.

## Animations

### A1. A new photo lands in the Evidence strip

After a photo is saved, its thumbnail grows in from 85% to full size (200 ms), with a teal ring that fades over 1 s. On Android, a 10 ms vibration (iPhone browsers don't allow vibration). It confirms the photo is saved, and where.

### A2. New rows show where they landed

A new Defect, Area or Item card expands into place (180 ms), and its background fades from light teal to white over 1 s. An undone Defect collapses out (150 ms). This matters most with Undo and AI Suggestions, where the change happens away from your finger.

### A3. Messages slide in and out of the bottom bar

The Undo or "Photo saved" message slides up from the bottom bar (160 ms) and slides out when it ends (120 ms), so the bar doesn't jump.

### A4. Screens slide in the direction you travel

Going deeper (Inspection, Area, Item) slides the new screen in from the right. Going back slides it in from the left (200 ms). The band stays put, so you see a sense of place without the whole screen moving. With reduce motion, it's a 100 ms fade.

### A5. AI Suggestions arrive visibly

A new AI Suggestion fades in, and its blue marker pulses once. On review, the card collapses (150 ms). If confirmed, the new Defect appears with A2's highlight.

### A6. Buttons respond to the press

Buttons shrink very slightly while pressed (to 97%, 80 ms). In glare, a press you can see is reassuring before the result appears.

### A7. Completing an Inspection ends on a clear moment

When an Inspection is completed, the "Export it now" panel appears with a check mark that draws once (400 ms). People judge an experience by its ending, and this is where an Inspection ends.

## Left out on purpose

- **Pull to refresh:** everything is on the phone, so there's nothing to refresh.
- **Celebrations such as confetti:** too much for a task done many times a day.
- **Animated loading skeletons:** screens load from the phone in well under 100 ms.
