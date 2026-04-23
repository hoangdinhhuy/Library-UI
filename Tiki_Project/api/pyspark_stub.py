# ============================================================
# PYSPARK STUB - Fake pyspark.sql.metrics for pickle compatibility
# ============================================================
"""
This module creates stub pyspark.sql.metrics classes to allow
loading Prophet pickle files that reference pyspark classes.

The actual pyspark.sql.metrics.PlanMetrics is not used, just
unpickled and discarded.
"""

import sys

class PlanMetrics:
    """Stub for pyspark.sql.metrics.PlanMetrics"""
    def __init__(self, *args, **kwargs):
        pass
    
    def __setstate__(self, state):
        pass
    
    def __getstate__(self):
        return {}

class MetricValue:
    """Stub for pyspark.sql.metrics.MetricValue"""
    def __init__(self, *args, **kwargs):
        pass
    
    def __setstate__(self, state):
        pass
    
    def __getstate__(self):
        return {}

# Create fake pyspark.sql.metrics module
class FakeSqlMetrics:
    PlanMetrics = PlanMetrics
    MetricValue = MetricValue

class FakeSql:
    metrics = FakeSqlMetrics()

class FakePyspark:
    sql = FakeSql()

# Register in sys.modules
sys.modules['pyspark.sql.metrics'] = FakeSqlMetrics()
sys.modules['pyspark.sql'] = FakeSql()
sys.modules['pyspark'] = FakePyspark()
