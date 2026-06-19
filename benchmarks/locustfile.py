import random
import string

from locust import HttpUser, between, task

REPEATED_POOL = [
    f"This is repeated sentence number {i} for cache testing purposes."
    for i in range(50)
]


def random_text(length: int = 40) -> str:
    return "".join(random.choices(string.ascii_lowercase + " ", k=length))


class UniqueTextUser(HttpUser):
    """Every request sends a unique text — no cache hits possible."""

    weight = 1
    wait_time = between(0.01, 0.05)

    @task
    def embed_unique(self):
        self.client.post("/embed", json={"text": random_text()})


class RepeatedTextUser(HttpUser):
    """Draws from a pool of 50 texts — high cache hit rate."""

    weight = 1
    wait_time = between(0.01, 0.05)

    @task
    def embed_repeated(self):
        self.client.post("/embed", json={"text": random.choice(REPEATED_POOL)})


class MixedTextUser(HttpUser):
    """70% repeated (from pool), 30% unique — realistic mixed workload."""

    weight = 3
    wait_time = between(0.01, 0.05)

    @task(7)
    def embed_repeated(self):
        self.client.post("/embed", json={"text": random.choice(REPEATED_POOL)})

    @task(3)
    def embed_unique(self):
        self.client.post("/embed", json={"text": random_text()})
