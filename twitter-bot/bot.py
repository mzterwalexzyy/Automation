import tweepy
import os
import random
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


def set_gha_output(key: str, value: str):
    """Passes a value back to the GitHub Actions workflow."""
    output_file = os.getenv("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"{key}={value}\n")
    else:
        print(f"[local] output: {key}={value}")


def get_user_id(username: str) -> str:
    resp = client.get_user(username=username)
    if not resp.data:
        raise ValueError(f"User @{username} not found — check TARGET_USERNAME in config.py")
    return str(resp.data.id)


def run():
    since_id = os.getenv("LAST_TWEET_ID") or None
    user_id = get_user_id(TARGET_USERNAME)

    kwargs = {"max_results": 5, "tweet_fields": ["created_at", "text"]}
    if since_id:
        kwargs["since_id"] = since_id
        print(f"Checking for tweets from @{TARGET_USERNAME} newer than {since_id}")
    else:
        print(f"First run — initialising checkpoint (no replies sent yet)")

    resp = client.get_users_tweets(user_id, **kwargs)
    tweets = resp.data or []

    if not tweets:
        print("No new tweets found.")
        return

    newest_id = str(tweets[0].id)

    if since_id:
        for tweet in reversed(tweets):  # oldest first so replies are in order
            reply = random.choice(REPLY_TEMPLATES)
            client.create_tweet(text=reply, in_reply_to_tweet_id=tweet.id)
            print(f"Replied to tweet {tweet.id}")
    else:
        # First run: record checkpoint without replying to old tweets
        print(f"Checkpoint set to {newest_id}. Future tweets will trigger replies.")

    set_gha_output("last_tweet_id", newest_id)


if __name__ == "__main__":
    run()
