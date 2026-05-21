import pytest
from httpx import AsyncClient, ASGITransport
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from server import app

@pytest.mark.anyio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/")
    assert r.status_code == 200

@pytest.mark.anyio
async def test_sim_state():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/sim/state")
    assert r.status_code == 200
    d = r.json()
    assert "robots" in d and "zones" in d

@pytest.mark.anyio
async def test_sim_reset():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/sim/reset")
    assert r.status_code == 200
    assert r.json()["ok"] is True
