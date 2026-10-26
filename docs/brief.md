# App brief: plates (What the Plate?)

The feature steps (41 to 51) say "subject" and "story" and defer to this brief for names, fields, limits, copy and AI rules. It lives in the project as `docs/brief.md` and in project knowledge. Where a prompt and this brief disagree about something subject-specific, the brief wins; about how to build something, the prompt wins. The pages already exist as static previews. Seed content is separate, in `docs/seed.md`, and only step 51 needs it.

## The app in one paragraph

**What the Plate?** is a site where every personalized license plate has stories behind it. Anyone can look up a US or Canadian plate and read what people think it means. An AI summary pulls a plate's stories together and shows where they agree and where they don't, without ever claiming to know the true meaning. Each day, a plate nobody has explained yet becomes the Plate of the Day, to invite its first story.

Brand line: "Little plates. Big stories."

## Vocabulary

| In the prompts | In the app |
|---|---|
| subject | plate |
| subject page | plate page |
| add a subject | Spot a Plate |
| story | story |
| meaning | "What do you think it means?" |
| source | "How do you know?" |
| story text | "Tell us more" |
| summary | "The Story So Far" |
| summary history | "Earlier summaries" |
| consensus | consensus badge |
| subject of the day | Plate of the Day |
| owner (a source claim) | the owner |

## Identifying a subject

A plate is identified by two values.

| Field | Column | Rule |
|---|---|---|
| State or Province | `identity_a` | Required. A code from the jurisdiction list, for example `US-WA`, `CA-ON`. Shown by its name. |
| Plate text | `identity_b` | Required. Letters, numbers, spaces and dashes only; 1 to 8 characters after spaces and dashes are removed. |

**Jurisdictions**: all 50 US states, the District of Columbia, and all 13 Canadian provinces and territories, as a reference table with code, name and country. The dropdown lists them alphabetically by name, labelled "State or Province", placeholder "Select a state or province".

**Normalized key**: the jurisdiction code, a `|`, then the plate text uppercased with spaces and dashes removed. O and 0 are different characters. So `US-WA` with "b7k 2l9" and "B7K-2L9" are the same plate.

**Display**: uppercase, keeping the first spotter's spacing and dashes.

**Validation messages**

| Case | Message |
|---|---|
| No jurisdiction | "Please select a state or province" |
| Other characters | "Plates can use letters, numbers, spaces, and dashes" |
| Empty | "Please enter the plate text" |
| Too long | "Plates can be up to 8 characters, not counting spaces and dashes" |

Search hint: "Spaces and dashes are ignored". Symbol plates are a known limitation.

**Images.** Plates are drawn by the plate component, never photographs.

## Subject status (derived, never stored)

| Condition | Label |
|---|---|
| No published stories | Mystery |
| Published stories, no owner story | Interpreted |
| An owner story exists | Owner weighed in |

Status-strip owner line: "No owner yet", or "Owner: {handle}".

## How do you know

Exactly four options, in this order. Store the key; show the label. The static pages use `knows` and `asked`; rename them to these keys.

| Key | Label | Weight in the summary |
|---|---|---|
| `owner` | It's my plate | Strongest, and always attributed: "a contributor who says it's their plate". Never "the owner confirms". |
| `knows_owner` | I know the owner | Strong, attributed |
| `secondhand` | I asked the driver | Medium, attributed |
| `guess` | My best guess | Lightest, and always welcome |

When the plate already has an owner story and someone picks `owner`: "Someone has already said this is their plate. Yours will appear alongside theirs."

## Stories

| Field | Rule |
|---|---|
| What do you think it means? | Required. One line, 3 to 80 characters. Placeholder: "A short, clear meaning for this plate" |
| How do you know? | Required. One of the four options above. |
| Tell us more | Optional. Up to 500 characters. Hint: "Keep places general, like near Seattle" |
| Photo | Optional, one per story. See "Photos". |

There are no where or when fields. A person may add more than one story to the same plate.

## What the checks enforce

**Subject check** (a new plate). It passes when the plate text is not offensive, including through common letter and number substitutions or reading it backwards, and does not spell out a slur, threat or sexual term.

**Story check.** A story passes when it:

- is about the plate, what it might mean, or seeing it
- contains no personal details: no names of private people, no contact details, no addresses, no exact locations, no times or routes that could identify where someone lives or works
- names places only in general terms, like "near Seattle"
- is free of harassment, hate, sexual content and threats
- makes no claims of fact about the owner's private life

**Handle check.** A handle passes when it is not hateful, sexual, harassing or impersonating staff.

The checks never return a reason to the visitor. Rejection copy is in the copy table.

## The summary

Written by AI from the published stories of one plate. Pending, hidden and deleted stories are never included.

- **Length**: two to four sentences. **Voice**: a friendly guide to the conversation, never an authority on the true meaning.
- **Weigh sources, don't count votes.** Hearts are never evidence of correctness or agreement.
- **Attribute, never verify.** "A contributor who says it's their plate explains...". Never "confirms" or "verified". The same restraint applies to "I know the owner" and "I asked the driver".
- **Lead with the disagreement** when there is one. **With one story**, summarize it and invite others.
- **Never quote a story word for word**, and never name the people who wrote them.

Alongside the text, the AI returns a **disagreement score**, a whole number from 0 to 100, shown as a consensus badge:

| Score | Badge |
|---|---|
| 0 to 33 | Largely agree |
| 34 to 66 | Mixed views |
| 67 to 100 | Opinions differ |

## Photos

One optional photo per story. The AI is asked for one thing: the box around the license plate. If none is found, the person draws the box. Everything outside the box is blurred in the browser; only the blurred, re-encoded image is uploaded.

| Where | Copy |
|---|---|
| Upload note | "We'll suggest the license plate area and blur everything else. You'll review and adjust it before sharing. The original photo is sent for detection and is never stored by our application." |
| Adjust note | "Move and resize the box so only the license plate is clear." |
| No box found | "We couldn't find the plate in this photo. Draw a box around it to keep it clear." |
| Review | "Before you share, check that faces, addresses, and other plates are blurred." |
| Unreadable file | "We couldn't read this photo. You can choose another, or continue without one." |

## Copy

| Key | Text |
|---|---|
| No match heading / body | "No plate found. Yet!" / "We couldn't find this plate in the collection. Want to add it?" |
| Exists | "We already know this plate!" |
| New subject | "A new mystery joins the collection!" / "Thanks for spotting this plate. You're the first to add it!" |
| Subject pending | "Your mystery is waiting in the wings!" / "Your plate is waiting for its safety check. You can see its status anytime in Your Submissions." |
| Subject rejected | "We couldn't add this plate." / "Our automated check couldn't approve this plate for the collection. Sometimes these checks get things wrong." |
| Someone else's pending subject | "Someone spotted this one already!" / "This plate has been submitted and is waiting for its check. Try looking again soon." |
| Check unavailable | "Hmm... something went wrong." / "We couldn't check this plate right now. Please try again in a few moments." |
| Story published | "Story submitted!" / "Your story has been added to this plate. Thanks for sharing!" |
| Story pending | "Your story is being checked." / "Your story is waiting for its safety check. You can see its status anytime in Your Submissions." |
| Story rejected | "We couldn't add this story. Our automated check couldn't approve it. Sometimes these checks get things wrong. Your words are still here if you'd like to edit and try again." |
| Private pending panel | "Your story is waiting for its check. Only you can see this for now." |
| Catching up | "New stories have arrived. The Story So Far is catching up." |
| Subject of the day, mystery | "No stories yet. What do you think {plate} means? Be the first to share your interpretation!" |
| Subject of the day, fallback | "Only {n} stories so far. What do you think {plate} means? Add yours to the conversation!" |
| Submissions pending | "Waiting for its check. We'll let you know when it's ready." |
| Submissions rejected | "We couldn't add your story." / "We couldn't add your plate." |
| Handle check unavailable | "We couldn't check that handle right now. Your current handle is unchanged. Try again soon." |
| Too many tries (any rate limit) | "You've done that a lot in a short time. Please wait a while and try again." |
| Demo intro | "Look around as a sample traveler. You'll see what contributors see, but nothing can be changed." |
| Demo banner | "You're exploring the demo. You can look around, but adding plates and stories is turned off." |
| Demo disabled form | "Adding stories is turned off in the demo." |
| Blocking (privacy page) | "Blocking someone hides their stories from your view. It doesn't remove their contributions from the shared plate summary." |

## Accounts and handles

- Generated handles for new accounts: `Traveler` followed by four digits, for example `Traveler4821`.
- Reserved handles (case ignored): admin, administrator, owner, demo, moderator, mod, staff, support, whattheplate, system, null, undefined.
- The demo sample account's handle is `Traveler4821`.
