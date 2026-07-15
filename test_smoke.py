"""Offline smoke tests. No API key, no network, no Gemini spend.

    python test_smoke.py

Run before pushing. Proves the service layer never prints, never leaks the key,
and that the deterministic financial math is correct.
"""
import sys, io, json, contextlib, types as pytypes
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Stub google.genai so the whole suite runs with no key, no network, no deps.
_g = pytypes.ModuleType("google"); _gg = pytypes.ModuleType("google.genai")
_gt = pytypes.ModuleType("google.genai.types")
class _Cfg:
    def __init__(self, **kw): [setattr(self, k, v) for k, v in kw.items()]
    def __getattr__(self, n): return None
class _Think:
    def __init__(self, thinking_budget=None): self.thinking_budget = thinking_budget
_gt.GenerateContentConfig=_Cfg; _gt.ThinkingConfig=_Think
_gt.Tool=_Cfg; _gt.GoogleSearch=_Cfg
_gg.types=_gt; _g.genai=_gg
sys.modules["google"]=_g; sys.modules["google.genai"]=_gg; sys.modules["google.genai.types"]=_gt

class R:
    def __init__(s,t): s.text=t
class M:
    def __init__(s,o): s.out=o; s.calls=[]
    def generate_content(s,**k): s.calls.append(k); return R(s.out)
    def generate_content_stream(s,**k):
        s.calls.append(k)
        for w in s.out.split(" "): yield R(w+" ")
class C:
    def __init__(s,o="1"): s.models=M(o)
import gem_client
_real_get_client = gem_client.get_client
fake=C("1"); gem_client.get_client=lambda: fake
ok=lambda m: print(f"  ok  {m}")

# 1 config absolute
import config
assert config.DATA_DIR.is_absolute() and config.PORTFOLIO_PATH.is_absolute()
ok("config: all paths absolute, CWD-independent")

# 2 secrets never leak
assert gem_client.key_fingerprint()=="(none)"
import os
os.environ["My_API_Key"]="AIzaSyTOPSECRET1234"
gem_client._env_loaded=False
assert gem_client.api_key_present()
fp=gem_client.key_fingerprint()
assert fp=="...1234" and "TOPSECRET" not in fp
ok(f"gem_client: fingerprint {fp} — key never exposed")
del os.environ["My_API_Key"]; gem_client._env_loaded=False
try:
    gem_client._client=None; _real_get_client(); assert False
except gem_client.MissingAPIKey as e:
    assert "TOPSECRET" not in str(e) and "your_key_here" in str(e)
ok("gem_client: MissingAPIKey message leaks nothing")

# 3 router
from PromptValidation import InputRoute, Route, GENERIC
assert InputRoute("x") is Route.GENERIC and Route.GENERIC==1==GENERIC
fake.models.out="2"; assert InputRoute("y") is Route.PERSONALIZED
ok("PromptValidation: routes + back-compat int compare")

# 4 doctrack
from DocTrack import normalize_state, _coerce_scope, FilingScope, DocTrackError
assert normalize_state("ny")=="New York"
assert _coerce_scope(1) is FilingScope.ALL and _coerce_scope("2") is FilingScope.INHERITOR
try: normalize_state("Narnia"); assert False
except DocTrackError: pass
ok("DocTrack: state validation + legacy 1/2 scope")

# 5 models/storage roundtrip
from models import *
from storage import PortfolioStore
import tempfile
_tmp=tempfile.mkdtemp()
st=PortfolioStore(path=_tmp+"/ft.json")
st.stocks=[]; st.assets=[]; st.debts=[]
from AssetManager import AssetManager, PortfolioSnapshot, ValuedPosition
am=AssetManager(st)
h=am.add_stock("AAPL",100,cost_basis_per_share=150.0,verify=False)
am.add_manual_asset("Home","real_estate",450000,outstanding_loan=120000)
am.add_debt("Visa","credit_card",4000,24.99,40)
am.add_debt("Loans","student",20000,6.8,220)
am.set_profile(annual_salary=100000,monthly_expenses=4000,emergency_fund=5000,
               risk_tolerance=RiskTolerance.MODERATE)
st2=PortfolioStore(path=_tmp+"/ft.json")
assert len(st2.stocks)==1 and st2.profile.annual_salary==100000
ok("storage: atomic JSON round-trip")

# 6 PlanAhead math
from PlanAhead import compute_metrics
snap=PortfolioSnapshot(positions=[ValuedPosition(h,210.0,21000.0,6000.0,"t",True)],
                       manual_assets=st.assets, debts=st.debts)
m=compute_metrics(snap, st.profile)
assert m.debt_plan[0].name=="Visa" and m.debt_plan[0].beats_investing
assert not m.debt_plan[1].beats_investing
assert abs(m.net_worth-327000.0)<1
json.dumps(m.to_dict())
ok(f"PlanAhead: net worth ${m.net_worth:,.0f}, avalanche order correct, JSON-ready")
assert any("doesn't cover its interest" in w for w in m.warnings)
ok("PlanAhead: negative-amortization warning fires")

# 7 RAG no stdout
from RAGresponse import RAGEngine
class FC:
    def count(s): return 2
    def query(s,**k): return {"documents":[["a","b"]],
        "metadatas":[[{"source":"x.pdf","page":1},{"source":"y.pdf","page":2}]],
        "distances":[[.1,.2]]}
    def add(s,**k): pass
    def delete(s,**k): pass
class FE:
    def encode(s,x,**k):
        import numpy as np
        return np.zeros((len(x),4)) if isinstance(x,list) else np.zeros(4)
eng=RAGEngine(); eng._collection=FC(); eng._embedder=FE()
fake.models.out="Answer here"
buf=io.StringIO()
with contextlib.redirect_stdout(buf):
    chunks=list(eng.stream_answer("q",auto_ingest=False))
assert buf.getvalue()=="" and "".join(chunks).strip()=="Answer here"
ok("RAGresponse: stream_answer yields, prints nothing")

# 8 assistant
from assistant import Assistant
a=Assistant(rag=eng)
r=a.ask("q",force_route=Route.PERSONALIZED)
assert r.error=="" and r.citations
json.dumps(r.to_dict())
ok("assistant: ask() -> JSON-ready, citations attached")
gem_client.get_client=lambda: (_ for _ in ()).throw(RuntimeError("down"))
bad=a.ask("q",force_route=Route.GENERIC)
assert bad.error and bad.text==""
ok("assistant: failures become result.error, never escape")
print("\nALL MODULES PASS")
