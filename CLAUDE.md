@AGENTS.md

# Neodrive website

Marketing site for **NEODRIVE**, a high speed time-attack racing game on Steam (app id `2804240`).
Three pages: **Home**, **Updates**, **Leaderboard** (track select → per-track leaderboard).

## Design source (Figma)

https://www.figma.com/design/0XdDHbMLzQSmCWMXGe6Obh/Neodrive

The Figma file is the source of truth for layout and styling. Each page has a **dark** and a **light** version
(both with the orange nav). Build both as themes of the same markup (e.g. `prefers-color-scheme` + a toggle),
not as separate pages. Frames are designed at 1920px wide; there are no mobile designs yet.

| Figma page  | Frames (node ids as of 2026-10-01)                                                         |
|-------------|--------------------------------------------------------------------------------------------|
| Home        | `17:2` dark, `16:2` light                                                                  |
| Updates     | `26:6` dark, `26:105` light                                                                |
| Leaderboard | Track select: `34:2` dark, `34:125` light · Track leaderboard: `31:3` dark, `31:190` light |

The Figma MCP runs on a **Starter plan with a low tool-call limit**. Read what you need in as few calls as possible
(one `get_screenshot` or `get_design_context` per frame), and rely on this file for tokens instead of re-reading Figma.

## Colour tokens

| Token          | Hex       | Use                                                                          |
|----------------|-----------|------------------------------------------------------------------------------|
| `orange`       | `#FE7C42` | Brand. Nav bar, primary buttons, CTA band, accent bars, "you" highlight      |
| `orange-deep`  | `#C2410C` | Orange **text** in light mode (small labels, numbers); plain orange is too low contrast on light |
| `ink`          | `#0B0B0D` | Dark-mode page bg; text on light and on orange; dark buttons                 |
| `card-dark`    | `#16161A` | Card / table surface in dark mode                                            |
| `paper`        | `#F6F5F3` | Light-mode page bg                                                           |
| `white`        | `#FFFFFF` | Text in dark mode; card surface in light mode                                |

- Text is `white` (dark) / `ink` (light) with opacity steps: headings 100%, intro 75%, body 65–70%, meta/labels 50–60%.
- Borders: 1px at 8% of the text colour. Light-mode cards also get a soft shadow `0 8px 24px rgba(0,0,0,.05)`.
- Orange text in dark mode uses `orange`; in light mode use `orange-deep`. Orange *fills* stay `orange` in both.
- Text on orange surfaces is always `ink`, never white, except the nav (white links and logo on orange).

## Typography

All fonts are on Google Fonts.

| Role                   | Font                                         | Notes                                                                 |
|------------------------|----------------------------------------------|-----------------------------------------------------------------------|
| Headings / titles      | **Exo 2 ExtraBold Italic** (800 italic)      | Uppercase in content. letter-spacing −1%, line-height ~98–104%        |
| Small headers / labels | **Bebas Neue**                               | Always `text-transform: uppercase`. Nav, buttons, eyebrows, card titles, table headers, footer links |
| Body                   | **IBM Plex Sans Condensed** 400 / 500        | line-height 150%. 500 for names, emphasis, arrows (→)                 |
| Times / numbers        | **JetBrains Mono** 500 / 700                 | Lap times and gaps, so the digits line up                             |

Sizes at 1920px (scale down responsively):
- Exo 2: page/hero titles 128, "Ready to race?" 92, section titles 76, showcase title 60, feature numbers (01/02/03) 56, big rank number 200, stage tabs 40, track codes (1-01) 36, table ranks 40 (top 3) / 32.
- Bebas Neue: card titles 40–44, stage heading 40, buttons 28 (+4% tracking), nav 26 (+4%), eyebrow 26 (+10%), footer links 22, table headers 22 (+8%, 50% opacity), tags 20.
- Plex: intro/subhead 24, card body 18–20, footer © 16.
- Mono: lap time 26 bold (table), 40 bold (your best lap), gap 20 at 50% opacity.

## Layout and components

- Content width 1680 (120px side padding at 1920). Sections: 120px top / 160px bottom padding. Grid gaps 24–32px.
- Corner radius: 2px buttons/tags, 4px cards. The look is sharp and angular; avoid pill shapes and big radii.
- **Nav**: full-width `orange` bar, white logo left (~260×108), links right in white (active 100%, others 85%),
  then a **dark** "Play now →" button (ink bg, white label, orange arrow).
- **Eyebrow**: 40×3px orange bar + 16px gap + Bebas label in orange. Sits above every section title.
- **Buttons**: padding 18/36. *Primary*: orange bg, ink label + "→". *Secondary*: transparent, 1.5px outline at 40% (dark) / 30% (light).
  *Dark*: ink bg, white label, orange "→".
- **Footer**: logo left; links + "© 2026 Neodrive" right. The current page's link is 100% opacity, others 60%. Light mode adds a 1px top border.
- **Logo**: the logo PNG is white on transparent. In light mode the footer shows it in `ink`. In CSS, use `mask-image` with the PNG
  and a `background-color`, or get an SVG of the logo.

### Home
Hero with the game screenshot full-bleed behind a gradient scrim (ink in dark mode, paper in light mode, strongest on the left)
→ eyebrow "Time attack racing", title "A HIGH SPEED RACING GAME", intro, Play now + View leaderboard.
→ "Built for the perfect lap" with 3 numbered feature cards → leaderboard showcase (image left, copy right)
→ orange "Ready to race?" CTA band → footer.

### Updates
Header "UPDATES" → 3-column grid of update cards → "Load older updates" → footer.
Each card: 16:9 image, orange version tag + date (Bebas), title (Bebas 40, 1 line, ellipsis),
body cut to 3 lines (`-webkit-line-clamp: 3`), and a "Read update →" link.

### Leaderboard
1. **Track select**: title "LEADERBOARDS". Left column of stage tabs (Tutorials, Stage 1–4; active = orange fill),
   then a 4-column grid of track cards with 24px gaps. Each card: thumbnail, then a label row with the track code
   (Exo 2, orange) and the track name (Plex 500). The selected card has an orange label row and a 3px orange border.
2. **Track leaderboard**: "← All tracks" back link, eyebrow "Leaderboard · Stage 1", title "1-01 ROCK HIGHWAY"
   (code in orange). Left: "Your rank" card (orange panel with the big rank, "of N (top X%)", then driver, best lap, gap to first).
   Right: table with Rank / Driver (avatar + name) / Gap / Time columns. Top 3 get orange rank and time.
   The current player's row has an orange tint, a 4px orange left border and a "YOU" tag.
   Table footer: "Showing 12 of N drivers" + "Show all →". Times use the game's format `00:09.233`.

Stage 1 tracks, from the in-game track select:
1-01 Rock Highway, 1-02 Boulevard Tour, 1-03 Mesa Corkscrew, 1-04 Three Eights, 1-05 Windmill Leap, 1-06 Dam Approach,
1-07 Autocross I, 1-08 Multilap Speedway, 1-09 Hydroplane Intro, 1-10 First Inversion, 1-11 Halfpipe Intro, 1-12 Cherry Ring,
1-13 Windmill Run, 1-14 Lancier Skidpad, 1-15 Inverse Camber, 1-16 Autocross II.
Tracks 1-04, 1-08, 1-12 and 1-16 are loop/lap tracks (circular arrow icon); the rest are point-to-point.
The tracks in Tutorials and Stages 2–4 are not known yet.

## Data

Use real data from Steam, not the Figma placeholder content. Everything below uses public endpoints and needs no API key,
except player names and avatars. Send a `User-Agent` header, and retry failed requests with backoff (1s, 2s, 4s).

### Leaderboards
1. **List boards**: `GET https://steamcommunity.com/stats/2804240/leaderboards/?xml=1`.
   Each `<leaderboard>` has `lbid`, `name`, `display_name`, `entries` (total count), `sortmethod` and `displaytype`.
   - `sortmethod`: 0 none, 1 ascending, 2 descending.
   - `displaytype`: 0 none, 1 numeric, 2 time_seconds, 3 time_milliseconds.
2. **Entries**: `GET https://steamcommunity.com/stats/2804240/leaderboards/<lbid>/?xml=1&start=<n>&end=<m>`.
   Ranks are 1-based; Steam returns at most 5000 entries per page.
   Each `<entries><entry>` has `rank`, `steamid`, `score`, `details` and `ugcid`.
   Keep paging (`start = end + 1`) while the response contains `<nextRequestURL>`.
3. **Formatting scores**: lap boards use `time_milliseconds`, so `score` is in ms. Display it as `MM:SS.mmm`,
   e.g. 9233 → `00:09.233`, to match the game. For `time_seconds`, use `M:SS`.
4. **Player names and avatars**: `GET https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=<KEY>&steamids=<id,id,...>`
   takes up to 100 IDs per call. Use `personaname`, plus the `avatar` / `avatarmedium` / `avatarfull` URLs.
   It needs a Steam Web API key (from https://steamcommunity.com/dev/apikey), so call it server-side and never expose the key.
   Without a key, only Steam IDs are available.

Steam board names still need mapping to track codes and names (e.g. 1-01 → Rock Highway). Inspect the `name` and
`display_name` values the list endpoint returns before building that mapping.

### Updates (news)
1. **Posts**: `GET https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2804240&count=<n>&maxlength=0&format=json&feeds=steam_community_announcements`.
   - `maxlength=0` returns full bodies. The `feeds` filter keeps only official announcements; drop it to include external news sites.
   - Items are in `appnews.newsitems[]`, with `gid` (id), `title`, `date` (unix seconds, UTC), `author`, `url` (Steam post link),
     `feedname`, `tags` and `contents`.
2. **Bodies are BBCode**, e.g. `[p]`, `[h1]`–`[h6]`, `[list]`, `[olist]`, `[*]`, `[img]`, `[url]`.
   - For card excerpts, turn block tags into newlines, strip all other `[...]` tags, and collapse 3+ newlines.
   - For full posts, convert BBCode to HTML properly.
3. **Images inside a post**: `[img src="..."]` and `[img]...[/img]`. URLs may contain the placeholder `{STEAM_CLAN_IMAGE}`;
   replace it with `https://clan.akamai.steamstatic.com/images`.
4. **Banner and capsule images** for update cards come from the store's events endpoint. It's undocumented and may break,
   so fall back to the first inline image, then a default image.
   - Request: `GET https://store.steampowered.com/events/ajaxgetpartnereventspageable/?appid=2804240&offset=0&count=<n>&l=english`.
   - Response: for each item in `events[]`, take `event_name` (matches the news `title`) and `announcement_body.clanid`,
     then parse the JSON string `jsondata`. It is sometimes a list instead of an object; treat that as "no images".
   - From it, the first non-empty entry of `localized_title_image` is the banner and of `localized_capsule_image` is the capsule
     (index 0 is English).
   - URL: `https://clan.akamai.steamstatic.com/images/<clanid>/<filename>`.

## Placeholder content in the Figma file (do not ship as fact)

- **Updates page**: all six cards (titles, version numbers, dates, text) are invented. Replace them with Steam news.
- **Leaderboard**: the entries come from a real in-game screenshot, but which track they belong to is unknown.
  "1-01 Rock Highway" is a placeholder. The avatars are coloured initials; use Steam avatars.
- **Home**: the showcase copy ("Every tenth of a second counts…") and the "Ready to race?" line were written for the mockup.
  The feature-card text is the owner's own wording.
- **Track thumbnails**: cropped low-res from an in-game screenshot; 1-01 still shows a play-button overlay. Replace them with proper captures.
- **Play now**: should link to the Steam store page, `https://store.steampowered.com/app/2804240`.
