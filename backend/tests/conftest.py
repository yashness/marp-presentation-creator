import pytest
from app.core.rate_limiter import limiter

@pytest.fixture(autouse=True)
def disable_rate_limiting():
    limiter.enabled = False
    yield
    limiter.enabled = True
