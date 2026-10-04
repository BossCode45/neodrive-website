#!/usr/bin/env python3
"""Fetch leaderboards and update/news posts for a Steam game (default: NEODRIVE, app 2804240).

Uses only public endpoints, no API key needed:
  - Leaderboards: https://steamcommunity.com/stats/<appid>/leaderboards/?xml=1
  - Updates/news: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/
  - Update banners: https://store.steampowered.com/events/ajaxgetpartnereventspageable/
    (undocumented store endpoint; if it fails, banners are skipped)

Optional: set STEAM_API_KEY to resolve Steam IDs to player names
(ISteamUser/GetPlayerSummaries). Get a key at https://steamcommunity.com/dev/apikey

Examples:
  python3 neodrive_steam.py                      # print everything
  python3 neodrive_steam.py --top 10             # top 10 per leaderboard
  python3 neodrive_steam.py --json out.json      # also save a full snapshot
  python3 neodrive_steam.py --news-only --news-count 5
  python3 neodrive_steam.py --news-only --news-count 1 --images --download-images img/
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

DEFAULT_APPID = 2804240
USER_AGENT = "steam-leaderboard-fetcher/1.0"
CLAN_IMAGE_BASE = "https://clan.akamai.steamstatic.com/images"  # what {STEAM_CLAN_IMAGE} resolves to
PAGE_SIZE = 5000  # Steam caps each XML page at 5000 entries

# Steam's ELeaderboardSortMethod / ELeaderboardDisplayType values
SORT_METHODS = {0: "none", 1: "ascending", 2: "descending"}
DISPLAY_TYPES = {0: "none", 1: "numeric", 2: "time_seconds", 3: "time_milliseconds"}


def http_get(url, params=None, retries=3):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"  retrying {url} ({e})", file=sys.stderr)
            time.sleep(2 ** attempt)


def _text(el, tag, default=None):
    child = el.find(tag)
    return child.text if child is not None and child.text is not None else default


def list_leaderboards(appid):
    root = ET.fromstring(http_get(f"https://steamcommunity.com/stats/{appid}/leaderboards/", {"xml": 1}))
    boards = []
    for lb in root.findall("leaderboard"):
        boards.append({
            "id": int(_text(lb, "lbid")),
            "name": _text(lb, "name"),
            "display_name": _text(lb, "display_name"),
            "entry_count": int(_text(lb, "entries", "0")),
            "sort_method": SORT_METHODS.get(int(_text(lb, "sortmethod", "0")), "unknown"),
            "display_type": DISPLAY_TYPES.get(int(_text(lb, "displaytype", "0")), "unknown"),
        })
    return boards


def fetch_entries(appid, lbid, limit=None):
    """Page through a leaderboard's entries (ranks are 1-based)."""
    entries, start = [], 1
    while True:
        end = start + PAGE_SIZE - 1
        if limit:
            end = min(end, limit)
        root = ET.fromstring(http_get(
            f"https://steamcommunity.com/stats/{appid}/leaderboards/{lbid}/",
            {"xml": 1, "start": start, "end": end},
        ))
        page = root.find("entries")
        rows = page.findall("entry") if page is not None else []
        for e in rows:
            entries.append({
                "rank": int(_text(e, "rank")),
                "steamid": _text(e, "steamid"),
                "score": int(_text(e, "score")),
                "details": _text(e, "details"),
                "ugcid": _text(e, "ugcid"),
            })
        if not rows or root.find("nextRequestURL") is None or (limit and len(entries) >= limit):
            break
        start = end + 1
    return entries


def fetch_player_names(steamids, api_key):
    names = {}
    ids = list(dict.fromkeys(steamids))
    for i in range(0, len(ids), 100):  # API accepts up to 100 IDs per call
        data = json.loads(http_get(
            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
            {"key": api_key, "steamids": ",".join(ids[i:i + 100])},
        ))
        for p in data.get("response", {}).get("players", []):
            names[p["steamid"]] = p.get("personaname")
    return names


def fetch_news(appid, count=20, feeds="steam_community_announcements"):
    params = {"appid": appid, "count": count, "maxlength": 0, "format": "json"}
    if feeds:
        params["feeds"] = feeds
    data = json.loads(http_get("https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/", params))
    items = []
    for n in data.get("appnews", {}).get("newsitems", []):
        items.append({
            "id": n["gid"],
            "title": n["title"],
            "date": dt.datetime.fromtimestamp(n["date"], dt.timezone.utc).isoformat(),
            "author": n.get("author"),
            "url": n.get("url"),
            "feed": n.get("feedname"),
            "tags": n.get("tags", []),
            "contents": n.get("contents", ""),
            "images": {"inline": body_images(n.get("contents", ""))},
        })
    return items


def body_images(contents):
    """Image URLs embedded in a post body: [img src="..."] and [img]...[/img]."""
    urls = re.findall(r'\[img[^\]]*?src="([^"]+)"', contents) + re.findall(r"\[img\]([^\[]+)\[/img\]", contents)
    return [u.strip().replace("{STEAM_CLAN_IMAGE}", CLAN_IMAGE_BASE) for u in urls]


def fetch_event_images(appid, count):
    """Banner (title) and capsule images for recent events, keyed by post title."""
    try:
        data = json.loads(http_get(
            "https://store.steampowered.com/events/ajaxgetpartnereventspageable/",
            {"appid": appid, "offset": 0, "count": count, "l": "english"},
        ))
    except Exception as e:
        print(f"  could not fetch update banners ({e})", file=sys.stderr)
        return {}
    images = {}
    for ev in data.get("events", []):
        clanid = ev.get("announcement_body", {}).get("clanid")
        j = json.loads(ev.get("jsondata") or "{}")
        if not isinstance(j, dict):  # some older events store a list here
            j = {}

        def first(key):
            name = next((x for x in j.get(key) or [] if x), None)  # index 0 is English
            return f"{CLAN_IMAGE_BASE}/{clanid}/{name}" if name and clanid else None

        images[ev["event_name"]] = {"banner": first("localized_title_image"), "capsule": first("localized_capsule_image")}
    return images


def download_images(news, out_dir):
    for n in news:
        imgs = n["images"]
        urls = [u for u in (imgs.get("banner"), imgs.get("capsule")) if u] + imgs["inline"]
        folder = os.path.join(out_dir, n["id"])
        for url in dict.fromkeys(urls):
            os.makedirs(folder, exist_ok=True)
            path = os.path.join(folder, os.path.basename(urllib.parse.urlparse(url).path))
            if not os.path.exists(path):
                with open(path, "wb") as f:
                    f.write(http_get(url))
            print(f"  saved {path}")


def format_score(score, display_type):
    if display_type == "time_milliseconds":
        m, ms = divmod(score, 60000)
        return f"{m}:{ms / 1000:06.3f}"
    if display_type == "time_seconds":
        m, s = divmod(score, 60)
        return f"{m}:{s:02d}"
    return str(score)


def strip_bbcode(text):
    text = re.sub(r"\[/?(p|h\d|list|olist|\*)\]", "\n", text)
    text = re.sub(r"\[[^\]]+\]", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--appid", type=int, default=DEFAULT_APPID)
    ap.add_argument("--top", type=int, help="only fetch the top N entries per leaderboard")
    ap.add_argument("--news-count", type=int, default=20)
    ap.add_argument("--all-feeds", action="store_true",
                    help="include external news feeds, not just official Steam announcements")
    ap.add_argument("--full-news", action="store_true", help="print full update text, not just titles")
    ap.add_argument("--images", action="store_true", help="list image URLs for each update (banner + inline)")
    ap.add_argument("--download-images", metavar="DIR", help="download update images into DIR/<post id>/")
    ap.add_argument("--leaderboards-only", action="store_true")
    ap.add_argument("--news-only", action="store_true")
    ap.add_argument("--json", metavar="FILE", help="write a full snapshot to FILE")
    args = ap.parse_args()

    snapshot = {"appid": args.appid, "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    api_key = os.environ.get("STEAM_API_KEY")

    if not args.news_only:
        boards = list_leaderboards(args.appid)
        for b in boards:
            b["entries"] = fetch_entries(args.appid, b["id"], args.top)
        if api_key:
            names = fetch_player_names([e["steamid"] for b in boards for e in b["entries"]], api_key)
            for b in boards:
                for e in b["entries"]:
                    e["name"] = names.get(e["steamid"])
        snapshot["leaderboards"] = boards

        print(f"=== Leaderboards ({len(boards)}) ===")
        for b in boards:
            print(f"\n{b['display_name']}  [{b['name']}, id {b['id']}, {b['entry_count']} entries]")
            for e in b["entries"]:
                who = e.get("name") or e["steamid"]
                print(f"  {e['rank']:>5}  {format_score(e['score'], b['display_type']):>12}  {who}")

    if not args.leaderboards_only:
        news = fetch_news(args.appid, args.news_count, None if args.all_feeds else "steam_community_announcements")
        if args.images or args.download_images or args.json:
            event_imgs = fetch_event_images(args.appid, max(args.news_count, 10))
            for n in news:
                n["images"].update(event_imgs.get(n["title"], {}))
        snapshot["news"] = news
        print(f"\n=== Updates / news ({len(news)}) ===")
        for n in news:
            print(f"\n{n['date'][:10]}  {n['title']}\n  {n['url']}")
            if args.images:
                for kind in ("banner", "capsule"):
                    if n["images"].get(kind):
                        print(f"  {kind}: {n['images'][kind]}")
                for url in n["images"]["inline"]:
                    print(f"  image: {url}")
            if args.full_news:
                print("\n" + strip_bbcode(n["contents"]) + "\n")
        if args.download_images:
            print()
            download_images(news, args.download_images)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print(f"\nSnapshot written to {args.json}")


if __name__ == "__main__":
    main()
