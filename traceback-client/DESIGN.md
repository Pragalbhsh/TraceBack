# TraceBack design & motion spec

This is the source of truth for how TraceBack looks and moves. Design it here first, then build it.
Implementation: tokens and keyframes in `src/motion.css`, behaviour in `src/lib/motion.js` and the components listed below.

## 1. Who we design for

Someone who just **lost** something is stressed and in a hurry, often on a phone with weak signal.
Someone who **found** something is doing a favour and will give up if it's fiddly.
So every screen must be **calm, fast and obvious**. Motion is there to **reassure and guide**, never to show off.

## 2. Motion principles

1. **Motion explains change.** Every animation answers *what just happened?*: where something came from, what was added, what was saved.
2. **Fast and calm.** UI responses take 120–320 ms. Nothing makes you wait for an animation; you can always click straight away.
3. **Celebrate what matters.** The two moments that matter are *a match was found* and *an item was reunited*. Only these get confetti.
4. **Show progress, not spinners.** Use skeletons that match the final layout, keep old results visible while new ones load, and show a meter as the post form is filled in.
5. **Respect people.** With `prefers-reduced-motion`, movement turns off and content appears instantly. Only `transform` and `opacity` are animated, so it stays smooth on cheap phones. No animation libraries.

## 3. Tokens

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 120 ms | press, colour changes |
| `--dur-2` | 200 ms | hover lift, focus glow, toggles |
| `--dur-3` | 320 ms | things entering: cards, pages, toasts, dialogs |
| `--dur-4` | 650 ms | storytelling: hero, meters, count-up, scroll reveal |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | default for entering |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | leaving |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | small "pop" confirmations (badges, checks) |
| `--stagger` | 45 ms per item, capped at 10 items | lists and grids |
| `--lift` | `translateY(-3px)` + `--shadow-lg` | hoverable cards and buttons |

Colour meaning stays fixed everywhere: **coral = lost**, **teal = found / success / reunited**, **indigo = actions and info**, **navy = brand chrome**.

## 4. Component specs

| Component | Behaviour |
|---|---|
| **Page** | Each route fades up 8 px (`--dur-3`). Query-string changes such as filters don't re-animate the page. |
| **Nav** | Turns translucent with blur and gains a shadow once you scroll. The active link has a coral underline that grows from the centre. The mobile menu slides and fades down, and the ☰ morphs into ✕. |
| **Hero** | Two soft coral and teal blobs drift slowly (paused for reduced motion). Headline, text, buttons and stats rise in sequence. Stats count up from 0. The main buttons get a light sweep on hover. |
| **Filter tabs** | A pill slides to the selected tab and takes that tab's colour (navy = all, coral = lost, teal = found). |
| **Results grid** | First load shows skeleton cards with a shimmer. When filters change, the old cards dim under a thin progress bar, then the new cards fade up in a stagger. |
| **Item card** | Lifts on hover, the photo zooms slightly, and category icons wiggle. Photos blur in on load. A match card shows a strength meter that fills after the card appears. |
| **Item page** | A skeleton matches the layout. Detail blocks rise in sequence. "Reunited" pops and throws confetti. Delete asks in a modal that scales in, not a browser popup. Copy and share confirm with a toast and a ✓ on the button. |
| **Report form** | The selected type card pops with a ✓. Hints cross-fade when switching lost / found. A **post strength** meter fills as useful details are added and says what to add next. Photos can be dropped onto a drop zone that highlights on drag-over. Submitting with errors shakes the form and focuses the first problem. The submit button shows an inline spinner. |
| **Post success** | The check mark draws itself, then the matches stagger in. Confetti only if a match was found. |
| **My posts** | Rows stagger in, and the match chip pulses 3 times to draw the eye. The email alerts switch knob slides. Marking reunited throws confetti and the row moves to "Reunited". |
| **Toasts** | Short confirmations slide up from the bottom and leave after 3.5 s. They are announced to screen readers (`aria-live`). Errors that need fixing stay inline instead. |
| **Alerts** | Slide down. Errors shake once. |
| **Empty states** | The icon floats gently. |
| **Scroll reveal** | Sections below the fold ("How it works", matches) rise in once as they enter the viewport. |

## 5. Accessibility rules

- Every animated thing works the same without animation (`prefers-reduced-motion: reduce` means instant).
- Nothing flashes more than 3 times a second. Looping motion is limited to the slow hero blobs and loaders.
- Focus is always visible (indigo ring with a soft glow), and dialogs trap focus (native `<dialog>`).
- Status changes (toasts, result counts) are announced. Decorative motion is `aria-hidden`.
- Text and colour combinations meet WCAG AA contrast (4.5:1).
