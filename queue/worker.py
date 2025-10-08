import os
import redis
from rq import Worker, Queue, Connection


def run_worker():
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    connection = redis.from_url(redis_url)
    queues = [Queue("etl", connection=connection)]
    with Connection(connection):
        worker = Worker(queues)
        worker.work(with_scheduler=True)


if __name__ == "__main__":
    run_worker()

