import tweepy
import time
import os
import json
import random
from datetime import datetime
from dotenv import load_dotenv
from config import REPLY_TEMPLATES, TARGET_USERNAME

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

client = tweepy.Client(
    bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
    consumer_key=os.getenv("TWITTER_API_KEY"),
    consumer_secret=os.getenv("TWITTER_API_SECRET"),
    access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
    access_token_secret=os.getenv("TWITTER_ACCESS_TOKEN_SECRET"),
    wait_on_rate_limit=True,
)

REPLIED_IDS_FILE = os.path.join(os.path.dirname(__file__), "replied_ids.json")
POLL_INTERVAL = 120  # seconds between checks


def load_replied_ids():
    if os.path.exists(REPLIED_IDS_FILE):
        with open(REPLIED_IDS_FILE) as f:
            return set(json.load(f))
    return set()


def save_replied_ids(ids):
    with open(REPLIED_IDS_FILE, "w") as f:
        json.dump(list(ids), f)


def get_user_id(username: str) -> str:
    resp = client.get_user(username=username)
    if not resp.data:
        raise ValueError(f"User @{username} not found — check the username in config.py")
    return str(resp.data.id)


def get_recent_tweets(user_id: str, since_id=None):
    kwargs = {"max_results": 5, "tweet_fields": ["created_at", "text"]}
    if since_id:
        kwargs["since_id"] = since_id
    resp = client.get_users_tweets(user_id, **kwargs)
    return resp.data or []


def run():
    print(f"Bot started — watching @{TARGET_USERNAME}")
    replied_ids = load_replied_ids()
    user_id = get_user_id(TARGET_USERNAME)
    print(f"Resolved @{TARGET_USERNAME} -> user_id={user_id}")
    since_id = None

    while True:
        try:
            tweets = get_recent_tweets(user_id, since_id=since_id)
            for tweet in reversed(tweets):  # oldest first
                tid = str(tweet.id)
                if tid not in replied_ids:
                    reply = random.choice(REPLY_TEMPLATES)
                    client.create_tweet(text=reply, in_reply_to_tweet_id=tweet.id)
                    print(f"[{datetime.now():%H:%M:%S}] Replied to {tid}: {reply[:80]}")
                    replied_ids.add(tid)
                    save_replied_ids(replied_ids)
                    time.sleep(5)  # brief pause between consecutive replies
            if tweets:
                since_id = tweets[0].id
        except tweepy.TooManyRequests:
            print("Rate limited — sleeping 15 min")
            time.sleep(900)
        except Exception as exc:
            print(f"[{datetime.now():%H:%M:%S}] Error: {exc}")

        print(f"[{datetime.now():%H:%M:%S}] Next check in {POLL_INTERVAL}s")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
