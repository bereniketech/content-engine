---
task: 033
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: devops-infra-expert
depends_on: [task-030, task-032]
---

# Task 033: Implement cost optimization and capacity planning

## Skills
- .kit/skills/cloud/aws-cost-optimizer/SKILL.md
- .kit/skills/devops/terminal-cli-devops/SKILL.md

## Agents
- @devops-infra-expert

## Commands
- /verify

---

## Objective
Monitor infrastructure costs, identify optimization opportunities, forecast capacity needs based on growth metrics, and establish processes for right-sizing resources.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `docs/COST_OPTIMIZATION.md` | Cost analysis and optimization opportunities |
| `monitoring/cost-dashboard.yml` | Cost tracking by service/resource |
| `scripts/capacity-forecast.py` | Forecast future capacity needs |

---

## Dependencies
- Depends on: task-030 (metrics established)
- Depends on: task-032 (performance profiling active)

---

## Code Templates

### `docs/COST_OPTIMIZATION.md`

```markdown
# Cost Optimization & Capacity Planning

## Current Infrastructure Costs

### Database (PostgreSQL on Supabase)
- Instance: 4 vCPU, 16GB RAM
- Monthly Cost: ~$400
- Utilization: Peak 65%, Off-peak 15%
- Optimization: Consider smaller instance during off-peak (save $150/mo)

### Cache Layer (Redis)
- Instance: 2GB memory
- Monthly Cost: ~$100
- Utilization: Peak 70%, Off-peak 20%
- Optimization: Right-size to 1GB, add TTL management (save $30/mo)

### API/Web Servers
- 3 × t3.medium instances (production)
- 2 × t3.medium instances (staging)
- Monthly Cost: ~$200
- Utilization: Peak 40% CPU, 50% memory
- Optimization: Use auto-scaling (save $50-100/mo)

### Data Transfer
- Outbound: 2TB/month
- Cost: ~$150/month
- Optimization: Implement CDN for static assets (save $50-75/mo)

### Monitoring & Observability
- Prometheus/Grafana: ~$80/month
- Distributed Tracing: ~$50/month
- Logs: ~$120/month
- Optimization: Reduce log retention, aggregate low-value metrics

## Optimization Opportunities

### Immediate (30-60 days)
| Opportunity | Effort | Savings | Priority |
|-------------|--------|---------|----------|
| Add auto-scaling to web servers | 1 day | $80/mo | P0 |
| Implement CDN for static assets | 2 days | $60/mo | P0 |
| Right-size Redis instance | 2 hours | $30/mo | P1 |
| Reduce log retention (7d → 3d) | 30 min | $40/mo | P1 |

### Medium-term (2-3 months)
| Opportunity | Effort | Savings | Priority |
|-------------|--------|---------|----------|
| Move to reserved instances | 1 day | $120/mo | P1 |
| Implement query result caching | 2 days | $50/mo DB | P2 |
| Archive cold logs to S3 | 1 day | $30/mo | P2 |

## Capacity Forecast (12 months)

Based on current growth rate (15% MoM user growth, 20% MoM API calls):

### Projected Load (12 months out)
- Daily Active Users: 80K → 380K (4.75× growth)
- API Requests/Day: 2M → 9.5M (4.75× growth)
- Database Size: 50GB → 150GB (3× growth, not linear due to aggregation)
- Peak Connection Pool: 15 → 35 connections

### Resource Planning

**Month 3:** Upgrade database to 8 vCPU (budget $600/mo)
**Month 6:** Add read replica for reporting queries (budget $400/mo)
**Month 9:** Upgrade web servers to t3.large (budget $400/mo)
**Month 12:** Consider managed database upgrade or sharding strategy

### Total Projected Monthly Cost (12 months)
- **Current:** ~$1,100/month
- **Month 3:** ~$1,300/month
- **Month 6:** ~$1,700/month
- **Month 9:** ~$2,100/month
- **Month 12:** ~$2,500/month

**Cost Efficiency:** $6.58 per user per month (target: <$3)

## Recommendations

### Priority 1: Implement auto-scaling
- Use AWS Auto Scaling Groups
- Scale on: CPU > 70%, memory > 80%
- Min: 2 instances, Max: 8 instances
- **Savings:** $80-100/month, better reliability

### Priority 2: Reduce logs retention
- Current: All logs retained 30 days
- Recommended: Error logs 30d, info 7d, debug 3d
- **Savings:** $40-60/month
- **Tradeoff:** Limited historical debugging capability

### Priority 3: Implement query result caching
- Cache frequent, expensive queries
- TTL: 5-60 minutes depending on data volatility
- **Savings:** $50-100/month database load
- **Implementation:** 2-3 days

### Priority 4: Move to reserved instances
- Reserve 60-70% of baseline capacity
- 1-year commitment: 25% discount
- **Savings:** $120-150/month
- **Tradeoff:** Less flexibility

## Cost Monitoring & Alerts

```bash
# Weekly cost report
aws ce get-cost-and-usage \
  --time-period Start=2024-04-21,End=2024-04-28 \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE | jq '.ResultsByTime | sort_by(.TimePeriod.Start)'
```

### Cost Anomaly Detection
- Alert if daily spend > 10% higher than rolling 30-day average
- Alert if any service > 20% of total spend
- Review monthly trends for growth alignment

## Cost vs. Performance Trade-offs

| Scenario | Current | Optimized | Trade-off |
|----------|---------|-----------|-----------|
| Database | 4vCPU 16GB ($400/mo) | 2vCPU 8GB ($150/mo) | P95 latency +50-100ms |
| Redis | 2GB ($100/mo) | 512MB ($40/mo) | Hit ratio -5%, more evictions |
| Web Servers | 3 instances ($200/mo) | Auto-scale 1-4 ($80-150/mo) | Startup delay 2-3 min |

**Recommendation:** Prioritize performance for production (latency + error rate), optimize cost for non-critical services (staging, analytics, caching).
```

### `monitoring/cost-dashboard.yml`

```yaml
# Cost tracking dashboard configuration

cost_tracking:
  enabled: true
  update_frequency: daily
  
  services:
    - name: database
      cost_per_month: 400
      metrics:
        - cpu_utilization
        - memory_utilization
        - query_performance
        - connection_count
      alerts:
        - name: "DB utilization > 80%"
          threshold: 80
          action: "Schedule upgrade review"
    
    - name: cache
      cost_per_month: 100
      metrics:
        - memory_utilization
        - hit_ratio
        - eviction_rate
      alerts:
        - name: "Hit ratio < 70%"
          threshold: 70
          action: "Review caching strategy"
    
    - name: compute
      cost_per_month: 200
      metrics:
        - cpu_utilization
        - memory_utilization
        - request_count
        - error_rate
      alerts:
        - name: "CPU > 70% sustained"
          threshold: 70
          duration: 10m
          action: "Scale up or optimize code"
    
    - name: data_transfer
      cost_per_month: 150
      metrics:
        - outbound_bytes_per_hour
        - cdn_hit_ratio
      alerts:
        - name: "Outbound > 2.5 TB/month"
          threshold: 2500
          action: "Implement CDN"
  
  reporting:
    - type: weekly_email
      recipients: [cto@company.com, finance@company.com]
      format: "Service costs, YoY growth, optimization recommendations"
    
    - type: monthly_review
      owner: "DevOps team"
      cadence: "First Tuesday of month"
      duration: "30 minutes"
```

### `scripts/capacity-forecast.py`

```python
#!/usr/bin/env python3
"""
Capacity forecasting tool based on historical growth metrics.
Projects future infrastructure needs.
"""

import json
from datetime import datetime, timedelta
import numpy as np

class CapacityForecaster:
    def __init__(self, metrics_history):
        self.metrics = metrics_history
        self.growth_rate = self._calculate_growth_rate()
    
    def _calculate_growth_rate(self):
        """Calculate month-over-month growth rate."""
        if len(self.metrics) < 2:
            return 0.15  # Default 15% MoM
        
        recent = self.metrics[-1]['value']
        previous = self.metrics[-2]['value']
        return (recent - previous) / previous
    
    def forecast(self, months=12):
        """Forecast metric values for N months."""
        if not self.metrics:
            return []
        
        current_value = self.metrics[-1]['value']
        forecasts = []
        
        for month in range(1, months + 1):
            future_value = current_value * ((1 + self.growth_rate) ** month)
            forecasts.append({
                'month': month,
                'projected_value': future_value,
                'confidence': 0.95 if month <= 3 else 0.80 if month <= 6 else 0.60
            })
        
        return forecasts
    
    def capacity_recommendations(self, current_capacity, max_utilization=0.8):
        """Recommend when to upgrade capacity."""
        forecast = self.forecast(months=12)
        recommendations = []
        
        for item in forecast:
            utilization = item['projected_value'] / current_capacity
            if utilization > max_utilization:
                recommendations.append({
                    'month': item['month'],
                    'upgrade_needed': True,
                    'required_capacity': item['projected_value'] / max_utilization,
                    'utilization': utilization
                })
        
        return recommendations

# Example usage
if __name__ == '__main__':
    # Load metrics from monitoring system
    metrics = [
        {'date': '2024-03-01', 'value': 50000},   # 50K DAU
        {'date': '2024-04-01', 'value': 57500},   # +15%
        {'date': '2024-05-01', 'value': 66125},   # +15%
    ]
    
    forecaster = CapacityForecaster(metrics)
    
    print("=== Capacity Forecast (12 months) ===\n")
    
    forecasts = forecaster.forecast(months=12)
    for item in forecasts:
        print(f"Month {item['month']:2d}: {item['projected_value']:,.0f} DAU "
              f"(confidence: {item['confidence']*100:.0f}%)")
    
    print("\n=== Upgrade Recommendations ===\n")
    
    recommendations = forecaster.capacity_recommendations(
        current_capacity=100000,  # Current capacity
        max_utilization=0.8
    )
    
    for rec in recommendations:
        print(f"Month {rec['month']}: Upgrade to {rec['required_capacity']:,.0f} "
              f"(current: {rec['utilization']*100:.0f}%)")
```

---

## Acceptance Criteria
- [ ] Current infrastructure costs documented
- [ ] Cost optimization opportunities identified (savings > $200/mo)
- [ ] Capacity forecast created for 12 months
- [ ] Auto-scaling configuration deployed
- [ ] Cost monitoring dashboard active
- [ ] Cost vs. performance trade-offs documented
- [ ] Monthly cost review process established
- [ ] Team trained on capacity planning
- [ ] `/verify` passes

---

## Implementation Steps
1. Audit current infrastructure costs (AWS, Supabase, monitoring)
2. Create cost optimization analysis document
3. Identify quick wins (auto-scaling, log retention, caching)
4. Implement auto-scaling for web servers
5. Set up cost monitoring and alerts
6. Create capacity forecast based on growth metrics
7. Schedule monthly cost review meetings
8. Run `/verify`

---

## Handoff to Next Task
_(fill via /task-handoff)_
