import time
import logging
from typing import Callable, Optional


class CircuitBreaker:
    """A minimal self-contained circuit breaker.

    States:
      CLOSED   - calls pass through; consecutive failures are counted.
      OPEN     - calls short-circuit to fallback; no upstream load.
      HALF_OPEN - a single trial call is allowed to test recovery.

    Usage:
        cb = CircuitBreaker(failure_threshold=3, timeout=30,
                            expected_exception=requests.RequestException)
        try:
            return cb.call(lambda: requests.get(url, timeout=5).json())
        except CircuitBreakerOpen:
            return fallback()
    """

    STATE_CLOSED = "closed"
    STATE_OPEN = "open"
    STATE_HALF_OPEN = "half_open"

    def __init__(
        self,
        failure_threshold: int = 3,
        timeout: int = 30,
        expected_exception: tuple = (Exception,),
        half_open_attempts: int = 1,
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.expected_exception = expected_exception
        self.half_open_attempts = half_open_attempts
        self._failures = 0
        self._opened_at = 0.0
        self._state = self.STATE_CLOSED
        self._half_open_allowed = half_open_attempts

    @property
    def state(self) -> str:
        if self._state == self.STATE_OPEN:
            if time.monotonic() - self._opened_at >= self.timeout:
                self._state = self.STATE_HALF_OPEN
                self._half_open_allowed = self.half_open_attempts
                logging.warning("CircuitBreaker: moving OPEN -> HALF_OPEN")
        return self._state

    def call(self, func: Callable, *args, **kwargs):
        state = self.state

        if state == self.STATE_OPEN:
            raise CircuitBreakerOpen("Circuit breaker is OPEN")

        if state == self.STATE_HALF_OPEN:
            if self._half_open_allowed <= 0:
                raise CircuitBreakerOpen("Circuit breaker is HALF_OPEN (trials exhausted)")
            self._half_open_allowed -= 1

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        if self._state != self.STATE_CLOSED:
            logging.info("CircuitBreaker: recovered -> CLOSED")
        self._state = self.STATE_CLOSED
        self._failures = 0

    def _on_failure(self):
        self._failures += 1
        logging.warning(f"CircuitBreaker: failure {self._failures}/{self.failure_threshold}")
        if self._failures >= self.failure_threshold:
            self._state = self.STATE_OPEN
            self._opened_at = time.monotonic()
            logging.error("CircuitBreaker: tripped OPEN")

    def reset(self):
        self._state = self.STATE_CLOSED
        self._failures = 0


class CircuitBreakerOpen(Exception):
    """Raised when a call is attempted while the breaker is open."""
    pass
