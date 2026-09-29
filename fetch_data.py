import asyncio
import aiohttp
import json
import time

BASE_URL = "https://jack.art/credits/rating/api/ranking?page={}&sort=rare"
TOTAL_ITEMS = 122154
PAGE_SIZE = 48
TOTAL_PAGES = (TOTAL_ITEMS // PAGE_SIZE) + 1
CONCURRENT_REQUESTS = 25

database = {}
completed_pages = 0

async def fetch_page(session, page, semaphore):
    global completed_pages
    url = BASE_URL.format(page)
    
    async with semaphore:
        for attempt in range(4):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get("items", [])
                        for item in items:
                            token_id = str(item.get("id"))
                            rank = item.get("rank")
                            score = item.get("score")
                            eights = item.get("eights", 0)

                            if token_id and rank:
                                entry = {
                                    "r": rank,
                                    "s": round(score, 1) if score is not None else None
                                }
                                # Store 'eights' only if 3 or more (Bronze: 3, Silver: 4, Gold: 5)
                                if eights and eights >= 3:
                                    entry["e"] = eights

                                database[token_id] = entry

                        completed_pages += 1
                        if completed_pages % 200 == 0 or completed_pages == TOTAL_PAGES:
                            print(f"Downloaded {completed_pages}/{TOTAL_PAGES} pages...")
                        return
                    elif response.status == 429:
                        await asyncio.sleep(2)
            except Exception:
                await asyncio.sleep(1)

async def main():
    print(f"Starting fetch for {TOTAL_PAGES} pages (Rank, Score, Eights)...")
    start_time = time.time()
    semaphore = asyncio.Semaphore(CONCURRENT_REQUESTS)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch_page(session, p, semaphore) for p in range(TOTAL_PAGES)]
        await asyncio.gather(*tasks)

    with open("ranks.json", "w", encoding="utf-8") as f:
        json.dump(database, f)

    elapsed = round(time.time() - start_time, 1)
    print(f"Success! {len(database)} tokens saved to ranks.json in {elapsed}s.")

if __name__ == "__main__":
    asyncio.run(main())